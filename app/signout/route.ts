// GET|POST /signout — end the session.
//
// Clearing the cookie is the whole of signing out: the session is stateless,
// so a cookie that is gone is an identity that is gone. Both cookies are
// dropped, in case a sign-in was abandoned half way.

import {
  authError,
  redirectResponse,
  safeReturnPath,
} from "../../lib/auth";
import {
  OAUTH_COOKIE,
  SESSION_COOKIE,
  clearCookieHeader,
} from "../../lib/session";

export const dynamic = "force-dynamic";

function signOut(request: Request, status: number): Response {
  return redirectResponse(
    safeReturnPath(new URL(request.url).searchParams.get("return_to")),
    [clearCookieHeader(SESSION_COOKIE), clearCookieHeader(OAUTH_COOKIE)],
    status,
  );
}

export async function GET(request: Request): Promise<Response> {
  return signOut(request, 302);
}

export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return authError(403, "ไม่อนุญาตคำขอจากเว็บไซต์อื่น");
  return signOut(request, 303);
}
