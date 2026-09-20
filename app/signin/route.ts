// GET /signin — start a Google sign-in.
//
// Authorization-code flow with PKCE. The state and the code verifier are not
// kept in server memory (there is none to keep between Netlify invocations):
// they ride in a short-lived cookie this server signed, which the callback
// verifies before it will exchange anything.

import {
  DEV_SIGN_IN_PATH,
  GOOGLE_AUTHORIZE_URL,
  authError,
  devAuthEnabled,
  googleConfig,
  redirectResponse,
  redirectUri,
  safeReturnPath,
} from "../../lib/auth";
import {
  OAUTH_COOKIE,
  OAUTH_TTL_SECONDS,
  codeChallenge,
  cookieHeader,
  randomToken,
  sessionSecret,
  signOAuthState,
} from "../../lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const returnTo = safeReturnPath(
    new URL(request.url).searchParams.get("return_to"),
  );

  // On a developer's machine, with the dev provider explicitly switched on,
  // sign-in is local and needs no Google project. Unreachable anywhere else.
  if (devAuthEnabled())
    return redirectResponse(
      `${DEV_SIGN_IN_PATH}?return_to=${encodeURIComponent(returnTo)}`,
    );

  const secret = sessionSecret();
  if (!secret)
    return authError(
      503,
      "ระบบลงชื่อเข้าใช้ยังไม่พร้อมใช้งาน กรุณาติดต่อเจ้าของร้าน",
    );

  const google = googleConfig();
  if (!google)
    return authError(
      503,
      "ร้านยังไม่ได้เชื่อมต่อการลงชื่อเข้าใช้ด้วย Google กรุณาติดต่อเจ้าของร้าน",
    );

  const state = randomToken();
  const verifier = randomToken();
  const handshake = await signOAuthState({ state, verifier, returnTo }, secret);

  const authorize = new URL(GOOGLE_AUTHORIZE_URL);
  authorize.searchParams.set("client_id", google.clientId);
  authorize.searchParams.set("redirect_uri", redirectUri(request));
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("scope", "openid email profile");
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("code_challenge", await codeChallenge(verifier));
  authorize.searchParams.set("code_challenge_method", "S256");
  authorize.searchParams.set("prompt", "select_account");

  return redirectResponse(authorize.toString(), [
    cookieHeader(OAUTH_COOKIE, handshake, OAUTH_TTL_SECONDS),
  ]);
}
