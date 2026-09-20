// GET|POST /auth/dev — sign in without Google, on a developer's machine only.
//
// This exists so this repository's own verification scripts can drive a real
// signed-in session against a local server, and so the shop can be clicked
// through offline. It mints exactly the same signed cookie the Google callback
// does; what it skips is Google, not the signature.
//
// It is gated by devAuthEnabled() (lib/auth.ts): NODE_ENV must not be
// production, PAWPAL_DEV_AUTH must be "1", and no NETLIFY environment variable
// may be present. When any of those fails the route answers 404 — not 403 —
// and says nothing about why.
//
// Even on a developer's own machine it mints an identity of the caller's
// choosing, so it is additionally held to three things a hostile page cannot
// arrange: the request must address this machine's loopback interface, it must
// not be a subresource some other site's page loaded, and it must not come
// from another origin. Without those, `<img src="http://localhost:3000/auth/
// dev?email=dev@pawpal.test">` on any page the developer visits quietly makes
// their browser the shop admin, and anyone sharing the Wi-Fi can do the same
// through the LAN address `next dev` prints.
//
//   node --run dev:next                      # with PAWPAL_DEV_AUTH=1 set
//   curl -i '/auth/dev?email=a@b.test&return_to=/'

import {
  DEV_USER,
  authError,
  devAuthEnabled,
  isSameOrigin,
  isTopLevelNavigation,
  redirectResponse,
  safeReturnPath,
} from "../../../lib/auth";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  cookieHeader,
  cookieName,
  sessionSecret,
  signSession,
} from "../../../lib/session";

export const dynamic = "force-dynamic";

const notFound = () =>
  new Response("Not found\n", {
    status: 404,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });

async function parameters(request: Request): Promise<URLSearchParams> {
  const fromUrl = new URL(request.url).searchParams;
  if (request.method !== "POST") return fromUrl;
  const type = request.headers.get("content-type") || "";
  if (!type.startsWith("application/x-www-form-urlencoded")) return fromUrl;
  const fromBody = new URLSearchParams(await request.text());
  for (const [name, value] of fromUrl) if (!fromBody.has(name)) fromBody.set(name, value);
  return fromBody;
}

/** Loopback only: `next dev` binds every interface and prints the LAN address. */
function onLoopback(request: Request): boolean {
  const { hostname } = new URL(request.url);
  return ["127.0.0.1", "localhost", "[::1]", "::1"].includes(hostname);
}

async function devSignIn(request: Request, status: number): Promise<Response> {
  if (!devAuthEnabled()) return notFound();
  if (!onLoopback(request)) return notFound();

  const secret = sessionSecret();
  if (!secret) return authError(503, "ระบบลงชื่อเข้าใช้ยังไม่พร้อมใช้งาน");

  const given = await parameters(request);
  const email = (given.get("email") || DEV_USER.email).trim();
  const sub = (given.get("sub") || DEV_USER.sub).trim();
  const name = (given.get("name") || DEV_USER.name).trim();
  if (
    !sub ||
    sub.length > 200 ||
    email.length > 200 ||
    name.length > 200 ||
    !/^[^@\s]+@[^@\s]+$/.test(email)
  )
    return authError(400, "ข้อมูลบัญชีทดสอบไม่ถูกต้อง");

  const session = await signSession({ sub, email, name: name || null }, secret);
  return redirectResponse(
    safeReturnPath(given.get("return_to")),
    [cookieHeader(cookieName(SESSION_COOKIE), session, SESSION_TTL_SECONDS)],
    status,
  );
}

/**
 * A navigation the shop itself started, or one no browser started at all.
 *
 * Typing the URL, following a link from the shop, and `curl` all pass; a page
 * on another origin sending the visitor here does not. Sec-Fetch-Site is the
 * reliable signal for a top-level GET, because browsers do not attach Origin
 * to one.
 */
function sameSiteDirect(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site && !["same-origin", "same-site", "none"].includes(site)) return false;
  return request.headers.get("origin") ? isSameOrigin(request) : true;
}

export async function GET(request: Request): Promise<Response> {
  if (!devAuthEnabled()) return notFound();
  // A GET that sets a session cookie is a login the caller did not have to be
  // trusted to perform, so it is refused unless the browser says the visitor
  // navigated here themselves, and unless it comes from this site or from a
  // client that sends no origin at all (curl, the verify scripts).
  if (!isTopLevelNavigation(request) || !sameSiteDirect(request))
    return authError(403, "ไม่อนุญาตคำขอจากเว็บไซต์อื่น");
  return devSignIn(request, 302);
}

export async function POST(request: Request): Promise<Response> {
  if (!devAuthEnabled()) return notFound();
  if (!isSameOrigin(request))
    return authError(403, "ไม่อนุญาตคำขอจากเว็บไซต์อื่น");
  return devSignIn(request, 303);
}
