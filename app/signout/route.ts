// GET|POST /signout — end the session.
//
// Clearing the cookie is the whole of signing out: the session is stateless,
// so a cookie that is gone is an identity that is gone. Both cookies are
// dropped, in case a sign-in was abandoned half way, and both spellings of
// each name are dropped, so a cookie left over from a build that ran under a
// different NODE_ENV cannot survive a sign-out.

import {
  authError,
  isSameOrigin,
  isTopLevelNavigation,
  redirectResponse,
  safeReturnPath,
} from "../../lib/auth";
import {
  OAUTH_COOKIE,
  SESSION_COOKIE,
  clearCookieHeader,
  cookieName,
} from "../../lib/session";

export const dynamic = "force-dynamic";

function signOut(request: Request, status: number): Response {
  const cleared = new Set(
    [SESSION_COOKIE, OAUTH_COOKIE].flatMap((base) => [
      base,
      cookieName(base),
    ]),
  );
  return redirectResponse(
    safeReturnPath(new URL(request.url).searchParams.get("return_to")),
    [...cleared].map(clearCookieHeader),
    status,
  );
}

/**
 * Sign-out is reachable by GET because it is an ordinary link on the page, so
 * it cannot require an Origin header the way the POST does. What it can
 * require is that a browser calls it the way a link is called: as a navigation
 * the visitor sees. Without that, `<img src="https://shop/signout">` on any
 * page on the internet logs the shop's customers out mid-checkout.
 */
export async function GET(request: Request): Promise<Response> {
  if (!isTopLevelNavigation(request))
    return authError(403, "ออกจากระบบได้จากหน้าร้านเท่านั้น");
  return signOut(request, 302);
}

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request))
    return authError(403, "ไม่อนุญาตคำขอจากเว็บไซต์อื่น");
  return signOut(request, 303);
}
