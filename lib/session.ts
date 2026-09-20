// Signed, stateless session cookies for PAWPAL.
//
// This module replaces the platform-injected `oai-authenticated-user-*`
// request headers the shop used to trust. Those headers were unsigned: once
// nothing on the edge injected and stripped them, any client could send
// `-H 'oai-authenticated-user-email: <owner>'` and read every order. A cookie
// signed with a server-side secret cannot be forged by the client, which is
// the whole point of the change.
//
// Only Web Crypto is used (`globalThis.crypto.subtle`), so the same code runs
// in Next's Node runtime, in a Netlify function and in a plain `node` script —
// no new dependency, nothing Node-specific.
//
// Token shape:  base64url(JSON payload) "." base64url(HMAC-SHA256)
// The MAC covers the payload bytes *and* a purpose label, so a token minted
// for the short-lived OAuth handshake can never be replayed as a session.

const encoder = new TextEncoder();

/** What a signed-in visitor is, for the rest of the app. */
export type SessionPayload = {
  /** Google's stable subject id for this account. */
  sub: string;
  email: string;
  name: string | null;
  /** Issued at / expires at, in seconds since the epoch. */
  iat: number;
  exp: number;
};

/** The in-flight OAuth handshake, parked in its own short-lived cookie. */
export type OAuthPayload = {
  state: string;
  verifier: string;
  returnTo: string;
  exp: number;
};

export const SESSION_COOKIE = "pawpal_session";
export const OAUTH_COOKIE = "pawpal_oauth";

/** A week is long enough to stay signed in between visits, short enough to matter. */
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
/** Re-issue once a session is past half its life, so active visitors never expire mid-order. */
export const SESSION_REFRESH_AFTER_SECONDS = SESSION_TTL_SECONDS / 2;
/** A sign-in handshake that has not come back within ten minutes is abandoned. */
export const OAUTH_TTL_SECONDS = 10 * 60;

const SESSION_PURPOSE = "pawpal.session.v1";
const OAUTH_PURPOSE = "pawpal.oauth.v1";

// ---------------------------------------------------------------------------
// The secret
// ---------------------------------------------------------------------------

let developmentSecret: string | null = null;
let warnedAboutMissingSecret = false;

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * The HMAC key material, or null when this deployment has none.
 *
 * In production a missing SESSION_SECRET is fatal to authentication: every
 * caller treats null as "nobody is signed in" and the sign-in routes refuse to
 * start a handshake, so the shop fails closed rather than handing out sessions
 * signed with a guessable key.
 *
 * Outside production a random per-process secret is generated instead. It is
 * never written down, so restarting the dev server invalidates old cookies —
 * which is the correct trade for not shipping a hardcoded development key that
 * could be reused somewhere real. Set SESSION_SECRET in .env to keep sessions
 * across restarts.
 */
export function sessionSecret(): string | null {
  const configured = (process.env.SESSION_SECRET || "").trim();
  if (configured) return configured;

  if (isProduction()) {
    if (!warnedAboutMissingSecret) {
      warnedAboutMissingSecret = true;
      console.error(
        "PAWPAL refuses to sign sessions: SESSION_SECRET is not set in this production environment. Nobody can sign in until it is.",
      );
    }
    return null;
  }

  if (!developmentSecret) {
    developmentSecret = base64urlEncode(
      crypto.getRandomValues(new Uint8Array(32)),
    );
    console.warn(
      "PAWPAL generated a throwaway SESSION_SECRET for this development process. Sessions end when it restarts; set SESSION_SECRET in .env to keep them.",
    );
  }
  return developmentSecret;
}

// ---------------------------------------------------------------------------
// Signing
// ---------------------------------------------------------------------------

const keyCache = new Map<string, Promise<CryptoKey>>();

function hmacKey(secret: string): Promise<CryptoKey> {
  const cached = keyCache.get(secret);
  if (cached) return cached;
  const pending = crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  keyCache.set(secret, pending);
  return pending;
}

async function signBytes(
  purpose: string,
  body: string,
  secret: string,
): Promise<Uint8Array> {
  const key = await hmacKey(secret);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${purpose}.${body}`),
  );
  return new Uint8Array(signature);
}

async function sign(
  purpose: string,
  payload: unknown,
  secret: string,
): Promise<string> {
  const body = base64urlEncode(encoder.encode(JSON.stringify(payload)));
  return `${body}.${base64urlEncode(await signBytes(purpose, body, secret))}`;
}

/**
 * The payload carried by a token, or null for anything that is not exactly a
 * token this server signed for this purpose.
 *
 * Every failure — wrong shape, bad base64, a flipped bit in the payload, a
 * signature from a different secret, an expired token — returns null. Callers
 * cannot accidentally distinguish "tampered" from "absent", so tampering fails
 * closed to signed out.
 */
async function verify<T extends { exp: number }>(
  purpose: string,
  token: string | undefined | null,
  secret: string | null,
): Promise<T | null> {
  if (!token || !secret) return null;

  const separator = token.indexOf(".");
  if (separator <= 0 || separator === token.length - 1) return null;
  const body = token.slice(0, separator);
  const presented = token.slice(separator + 1);

  let presentedBytes: Uint8Array;
  try {
    presentedBytes = base64urlDecode(presented);
  } catch {
    return null;
  }

  const expected = await signBytes(purpose, body, secret);
  // Compared in constant time: a byte-by-byte early exit would let an attacker
  // who can retry cheaply recover a valid MAC one byte at a time.
  if (!timingSafeEqual(expected, presentedBytes)) return null;

  let payload: T;
  try {
    payload = JSON.parse(new TextDecoder().decode(base64urlDecode(body)));
  } catch {
    return null;
  }
  if (!payload || typeof payload !== "object") return null;
  if (typeof payload.exp !== "number" || payload.exp * 1000 <= Date.now())
    return null;
  return payload;
}

/** Fixed-time comparison; the length check leaks only the length, never content. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1)
    difference |= a[index] ^ b[index];
  return difference === 0;
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export async function signSession(
  user: { sub: string; email: string; name: string | null },
  secret: string,
  now = Date.now(),
): Promise<string> {
  const issuedAt = Math.floor(now / 1000);
  const payload: SessionPayload = {
    sub: user.sub,
    email: user.email,
    name: user.name,
    iat: issuedAt,
    exp: issuedAt + SESSION_TTL_SECONDS,
  };
  return sign(SESSION_PURPOSE, payload, secret);
}

export async function verifySession(
  token: string | undefined | null,
  secret: string | null,
): Promise<SessionPayload | null> {
  const payload = await verify<SessionPayload>(SESSION_PURPOSE, token, secret);
  if (!payload) return null;
  if (typeof payload.sub !== "string" || !payload.sub) return null;
  if (typeof payload.email !== "string" || !payload.email) return null;
  if (typeof payload.iat !== "number") return null;
  if (payload.name !== null && typeof payload.name !== "string") return null;
  return payload;
}

/** True once a live session is old enough to be worth re-issuing. */
export function shouldRefresh(
  payload: SessionPayload,
  now = Date.now(),
): boolean {
  return Math.floor(now / 1000) - payload.iat >= SESSION_REFRESH_AFTER_SECONDS;
}

// ---------------------------------------------------------------------------
// The OAuth handshake cookie
// ---------------------------------------------------------------------------

export async function signOAuthState(
  handshake: { state: string; verifier: string; returnTo: string },
  secret: string,
  now = Date.now(),
): Promise<string> {
  const payload: OAuthPayload = {
    ...handshake,
    exp: Math.floor(now / 1000) + OAUTH_TTL_SECONDS,
  };
  return sign(OAUTH_PURPOSE, payload, secret);
}

export async function verifyOAuthState(
  token: string | undefined | null,
  secret: string | null,
): Promise<OAuthPayload | null> {
  const payload = await verify<OAuthPayload>(OAUTH_PURPOSE, token, secret);
  if (!payload) return null;
  if (typeof payload.state !== "string" || !payload.state) return null;
  if (typeof payload.verifier !== "string" || !payload.verifier) return null;
  if (typeof payload.returnTo !== "string") return null;
  return payload;
}

/** Constant-time equality for the two halves of the OAuth state check. */
export function sameState(a: string, b: string): boolean {
  return timingSafeEqual(encoder.encode(a), encoder.encode(b));
}

// ---------------------------------------------------------------------------
// Cookie attributes
// ---------------------------------------------------------------------------

/**
 * A Set-Cookie value, written out by hand.
 *
 * Route handlers attach this to the Response they return rather than mutating
 * next/headers' cookie store, so the header is on the wire whatever shape the
 * response has — including the 302s that carry every sign-in and sign-out.
 *
 *   HttpOnly     script on the page can never read or exfiltrate the session
 *   SameSite=Lax another site's form post arrives without it, so the shop's
 *                state-changing endpoints cannot be driven cross-site
 *   Secure       in production only; on http://localhost a Secure cookie
 *                would simply be dropped
 *   Path=/       one session for the storefront, the API and /admin alike
 */
export function cookieHeader(
  name: string,
  value: string,
  maxAgeSeconds: number,
): string {
  const parts = [
    `${name}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`,
  ];
  if (isProduction()) parts.push("Secure");
  return parts.join("; ");
}

/** Expire a cookie now: same attributes, empty value, Max-Age=0. */
export function clearCookieHeader(name: string): string {
  return `${cookieHeader(name, "", 0)}; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

// ---------------------------------------------------------------------------
// PKCE
// ---------------------------------------------------------------------------

/** 32 random bytes, base64url — 43 characters, inside RFC 7636's 43..128. */
export function randomToken(): string {
  return base64urlEncode(crypto.getRandomValues(new Uint8Array(32)));
}

export async function codeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(verifier),
  );
  return base64urlEncode(new Uint8Array(digest));
}

// ---------------------------------------------------------------------------
// base64url
// ---------------------------------------------------------------------------

export function base64urlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64urlDecode(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(value)) throw new Error("not base64url");
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1)
    bytes[index] = binary.charCodeAt(index);
  return bytes;
}
