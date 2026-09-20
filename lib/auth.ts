// Who may sign in, how, and where they land afterwards.
//
// The sign-in surface is Google only, for customers and for the shop owner
// alike. Admin rights are not a property of the login: they are the existing
// ADMIN_EMAIL allowlist applied to the verified Google address, exactly as
// before (lib/server.ts).

import { onNetlify } from "./blob-store";

export const SIGN_IN_PATH = "/signin";
export const SIGN_OUT_PATH = "/signout";
export const CALLBACK_PATH = "/auth/google/callback";
export const DEV_SIGN_IN_PATH = "/auth/dev";

const RESERVED_PATHS = new Set([
  SIGN_IN_PATH,
  SIGN_OUT_PATH,
  CALLBACK_PATH,
  DEV_SIGN_IN_PATH,
]);

export const GOOGLE_AUTHORIZE_URL =
  "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
/** Google issues both spellings; both are legitimate. */
export const GOOGLE_ISSUERS = new Set([
  "accounts.google.com",
  "https://accounts.google.com",
]);

// ---------------------------------------------------------------------------
// Redirect targets
// ---------------------------------------------------------------------------

/**
 * The only redirect targets this app will ever send a visitor to after login:
 * a path on this same site.
 *
 * Anything else — an absolute URL, a protocol-relative `//evil.test` that a
 * browser resolves against the current scheme, a backslash-smuggled authority,
 * or one of the auth routes themselves (which would loop) — collapses to "/".
 */
export function safeReturnPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/")) return "/";
  if (value.startsWith("//") || value.startsWith("/\\")) return "/";

  let url: URL;
  try {
    url = new URL(value, "https://pawpal.invalid");
  } catch {
    return "/";
  }
  if (url.origin !== "https://pawpal.invalid") return "/";
  if (RESERVED_PATHS.has(url.pathname)) return "/";
  return `${url.pathname}${url.search}${url.hash}`;
}

export function signInPath(returnTo: string): string {
  return `${SIGN_IN_PATH}?return_to=${encodeURIComponent(safeReturnPath(returnTo))}`;
}

export function signOutPath(returnTo = "/"): string {
  return `${SIGN_OUT_PATH}?return_to=${encodeURIComponent(safeReturnPath(returnTo))}`;
}

/**
 * The origin this request arrived on, so the OAuth redirect_uri points back at
 * the host the visitor is actually using rather than an internal one. Set
 * GOOGLE_REDIRECT_URI to override it outright.
 *
 * This reads forwarded headers, which a client can set, so it is used for the
 * redirect_uri and nothing else — never as a security decision. A forged host
 * only produces a redirect_uri Google does not recognise, and both /signin and
 * the callback derive it the same way, so a mismatch fails the exchange rather
 * than redirecting anyone anywhere. The origin checks on the POST routes use
 * `new URL(request.url).origin`, the same primitive lib/server.ts uses.
 */
export function requestOrigin(request: Request): string {
  const headers = request.headers;
  const forwardedHost = headers.get("x-forwarded-host");
  const host = forwardedHost || headers.get("host");
  if (host) {
    const proto =
      headers.get("x-forwarded-proto")?.split(",")[0].trim() ||
      new URL(request.url).protocol.replace(":", "");
    return `${proto}://${host}`;
  }
  return new URL(request.url).origin;
}

export function redirectUri(request: Request): string {
  const configured = (process.env.GOOGLE_REDIRECT_URI || "").trim();
  return configured || `${requestOrigin(request)}${CALLBACK_PATH}`;
}

// ---------------------------------------------------------------------------
// Google configuration
// ---------------------------------------------------------------------------

export type GoogleConfig = { clientId: string; clientSecret: string };

export function googleConfig(): GoogleConfig | null {
  const clientId = (process.env.GOOGLE_CLIENT_ID || "").trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || "").trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

// ---------------------------------------------------------------------------
// The development-only provider
// ---------------------------------------------------------------------------

/**
 * Whether /auth/dev exists at all.
 *
 * Three independent conditions, all required, so no single misconfiguration
 * can expose it on a deployed site:
 *
 *   1. NODE_ENV !== "production"  — a production build never enables it, and
 *      `next build` bakes NODE_ENV=production into the server it produces.
 *   2. PAWPAL_DEV_AUTH === "1"    — opt in explicitly, per environment.
 *   3. not on Netlify             — the deploy target is ruled out by its own
 *      environment even if the first two were somehow both wrong.
 *
 * When this is false the route is not merely disabled: it answers 404, so a
 * deployed build is indistinguishable from one that never had the route.
 */
export function devAuthEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if ((process.env.PAWPAL_DEV_AUTH || "").trim() !== "1") return false;
  if (onNetlify()) return false;
  // Any NETLIFY* variable that actually carries a value means a Netlify
  // environment. Empty ones are ignored, because .env.example ships
  // `NETLIFY_BLOBS_STORE=` as a blank placeholder and a copied .env would
  // otherwise silently disable local sign-in.
  if (
    Object.entries(process.env).some(
      ([name, value]) =>
        (name === "NETLIFY" || name.startsWith("NETLIFY_")) &&
        typeof value === "string" &&
        value.trim() !== "",
    )
  )
    return false;
  return true;
}

export const DEV_USER = {
  sub: "dev-local-user",
  email: "dev@pawpal.test",
  name: "นักช้อปทดสอบ",
};

// ---------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------

function authHeaders(setCookies: string[]): Headers {
  const headers = new Headers({
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  });
  for (const cookie of setCookies) headers.append("Set-Cookie", cookie);
  return headers;
}

export function redirectResponse(
  location: string,
  setCookies: string[] = [],
  status = 302,
): Response {
  const headers = authHeaders(setCookies);
  headers.set("Location", location);
  return new Response(null, { status, headers });
}

/** Sign-in problems are read by people, so they are plain Thai, not JSON. */
export function authError(
  status: number,
  message: string,
  setCookies: string[] = [],
): Response {
  const headers = authHeaders(setCookies);
  headers.set("Content-Type", "text/plain; charset=utf-8");
  return new Response(`${message}\n`, { status, headers });
}

// ---------------------------------------------------------------------------
// The Google id_token
// ---------------------------------------------------------------------------

export type GoogleIdentity = { sub: string; email: string; name: string | null };

type IdTokenClaims = {
  iss?: unknown;
  aud?: unknown;
  sub?: unknown;
  exp?: unknown;
  email?: unknown;
  email_verified?: unknown;
  name?: unknown;
};

/**
 * The account an id_token describes, or null if it is not one we accept.
 *
 * The token's signature is not re-checked here, and deliberately so: it was
 * fetched by this server over TLS from Google's own token endpoint, in a call
 * authenticated with our client secret, so its origin is already established
 * (this is the case OpenID Connect core 3.1.3.7 allows to skip). What must
 * still be checked is what the token *says*, because a token Google issued for
 * a different application, or for an unverified address, is not an identity
 * for this shop:
 *
 *   iss             one of Google's two issuer spellings
 *   aud             this application's own client id, not somebody else's
 *   exp             still in the future
 *   email_verified  true — an unverified address proves nothing, and the
 *                   ADMIN_EMAIL allowlist is matched on email
 */
export function identityFromIdToken(
  idToken: string,
  clientId: string,
  now = Date.now(),
): GoogleIdentity | null {
  const claims = decodeJwtClaims(idToken);
  if (!claims) return null;

  if (typeof claims.iss !== "string" || !GOOGLE_ISSUERS.has(claims.iss))
    return null;
  if (claims.aud !== clientId) return null;
  if (typeof claims.exp !== "number" || claims.exp * 1000 <= now) return null;
  if (claims.email_verified !== true) return null;
  if (typeof claims.sub !== "string" || !claims.sub) return null;
  if (typeof claims.email !== "string" || !claims.email) return null;

  return {
    sub: claims.sub,
    email: claims.email,
    name: typeof claims.name === "string" && claims.name ? claims.name : null,
  };
}

function decodeJwtClaims(token: string): IdTokenClaims | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(parts[1].length / 4) * 4, "=");
    const claims = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(atob(payload), (c) => c.charCodeAt(0)),
      ),
    );
    return claims && typeof claims === "object" ? claims : null;
  } catch {
    return null;
  }
}
