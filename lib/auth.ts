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
 *
 * The authority check is applied to the *normalised* path, not to the string
 * that came in, because those are not the same thing: "/..//evil.test/steal"
 * starts with a single slash and parses against a harmless base, yet its
 * pathname normalises to "//evil.test/steal", which a browser reading it in a
 * Location header resolves as an authority. Checking the input alone let that
 * through; checking url.pathname is what actually ships in the header.
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

  const path = url.pathname;
  if (!path.startsWith("/")) return "/";
  if (path.startsWith("//") || path.startsWith("/\\")) return "/";
  if (RESERVED_PATHS.has(path)) return "/";
  return `${path}${url.search}${url.hash}`;
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
// Same-site requests
// ---------------------------------------------------------------------------

/**
 * The site the request claims to come from: its Origin, or the origin of its
 * Referer when there is no Origin. Null when it claims nothing at all.
 *
 * A browser sends Origin on every state-changing request, so "claims nothing"
 * means the caller is not a browser acting for a signed-in visitor — which is
 * precisely the case that must not be waved through.
 */
export function statedOrigin(request: Request): string | null {
  const origin = request.headers.get("origin");
  if (origin) return origin;
  const referer = request.headers.get("referer");
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

/**
 * Whether a state-changing request came from this same site.
 *
 * The comparison is against requestOrigin(request) — the host the visitor's
 * browser actually addressed — and not against `new URL(request.url).origin`,
 * which is what the check used to use. Next builds that URL from the server's
 * own bind address (`http://localhost:<port>` under `next start`, whatever the
 * Host header says), so comparing against it refuses the genuine browser
 * requests of any deployment that is not served from localhost. A cross-site
 * form post carries the *victim's* Host and the *attacker's* Origin, so
 * comparing those two is exactly the CSRF question; a client that forges Host
 * to match its own Origin has described nothing but itself and still holds no
 * session cookie.
 *
 * Hosts are compared, not whole origins: behind a TLS-terminating proxy that
 * does not set x-forwarded-proto, the server sees http where the browser says
 * https, and an otherwise correct deployment would refuse every write. The
 * scheme carries no CSRF information that the host does not — an attacker who
 * can answer for this host has already won — but it must still be a web
 * origin, so `null` and non-http schemes are refused.
 *
 * A request that states no origin at all is refused too. Omitting the Origin
 * header used to skip the check entirely, which left the browser's own
 * SameSite=Lax handling of the cookie as the only thing between the shop and a
 * cross-site write.
 */
export function isSameOrigin(request: Request): boolean {
  const stated = statedOrigin(request);
  if (!stated) return false;
  try {
    const claimed = new URL(stated);
    if (claimed.protocol !== "http:" && claimed.protocol !== "https:")
      return false;
    return claimed.host === new URL(requestOrigin(request)).host;
  } catch {
    return false;
  }
}

/**
 * Whether the browser says this is a page the visitor is navigating to, rather
 * than a subresource some other page decided to load.
 *
 * `<img src="…/auth/dev?email=owner">` and `<link rel=prefetch>` arrive with
 * Sec-Fetch-Dest: image / empty and no Origin at all, so neither an origin
 * check nor SameSite=Lax stops them from driving a GET that sets a cookie.
 * Clients that send no Sec-Fetch headers — this repo's own verify scripts,
 * curl — are treated as navigations, because they are not the ones being
 * tricked.
 *
 * A speculative prefetch is refused as well: the browser fetching a document
 * the visitor has not asked for yet is not the visitor asking for it, and the
 * sign-out link on the admin page is exactly the sort of link a browser may
 * decide to warm up.
 */
export function isTopLevelNavigation(request: Request): boolean {
  if ((request.headers.get("sec-purpose") || "").includes("prefetch"))
    return false;
  const destination = request.headers.get("sec-fetch-dest");
  if (!destination) return true;
  return destination === "document";
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
 * When this is false the route is not merely disabled: it answers 404 and says
 * nothing about why — no hint that a dev provider exists, no configuration to
 * probe for. It is not byte-identical to the framework's own 404 page, so a
 * determined prober can tell that this path is handled; what they cannot do is
 * get an identity out of it, because all three conditions above are read from
 * the server's environment and none of them is reachable from a request.
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Sign-in problems are read by people, so they are a page, not JSON and not a
 * bare line of text.
 *
 * Every failure on the sign-in path lands here: a shop that is not configured
 * for Google yet, a handshake that sat in an open tab past its ten minutes,
 * Google being unreachable, an unverified address. A customer who hits one of
 * those in the middle of a checkout was previously shown one sentence on a
 * white page with no way back — so the page carries the shop's own card, a way
 * to try again where trying again can work, and a link back to the storefront.
 *
 * It is written out by hand rather than rendered: these are route handlers, and
 * the styles they need are a dozen lines. `retryTo`, when given, is a path
 * already through safeReturnPath.
 */
export function authError(
  status: number,
  message: string,
  setCookies: string[] = [],
  retryTo: string | null = null,
): Response {
  const headers = authHeaders(setCookies);
  headers.set("Content-Type", "text/html; charset=utf-8");
  const retry = retryTo
    ? `<a class="primary" href="${escapeHtml(signInPath(retryTo))}">ลองอีกครั้ง</a>`
    : "";
  return new Response(
    `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>PAWPAL</title>
<style>
  body { margin:0; min-height:100dvh; display:flex; align-items:center; justify-content:center;
         padding:30px; background:#ecf3ff; color:#17324c;
         font-family:system-ui,-apple-system,"Segoe UI",sans-serif; }
  .card { background:#fff; max-width:530px; padding:40px; border-radius:23px; text-align:center;
          box-shadow:0 20px 70px #294a7d0c; }
  h1 { font-size:26px; margin:0 0 17px; font-weight:600; }
  p { font-size:16px; color:#71869b; line-height:1.9; margin:0 0 24px; }
  a { display:inline-block; text-decoration:none; }
  .primary { background:#17324c; color:#fff; border-radius:30px; padding:13px 27px; font-size:15px; }
  .back { color:#17324c; font-size:14px; border-bottom:1px solid #30233f; padding-bottom:7px;
          margin-top:18px; }
</style>
</head>
<body>
  <main class="card">
    <h1>PAWPAL</h1>
    <p>${escapeHtml(message)}</p>
    ${retry}
    <div><a class="back" href="/">กลับไปหน้าร้าน →</a></div>
  </main>
</body>
</html>
`,
    { status, headers },
  );
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
