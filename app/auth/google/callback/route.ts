// GET /auth/google/callback — finish a Google sign-in.
//
// Nothing here trusts the query string on its own. The state that comes back
// is only accepted if it matches the state inside the handshake cookie this
// server signed at /signin, and the code is exchanged server-to-server with
// the client secret and the PKCE verifier before any identity is minted.

import { cookies } from "next/headers";
import {
  GOOGLE_TOKEN_URL,
  authError,
  googleConfig,
  identityFromIdToken,
  redirectResponse,
  redirectUri,
} from "../../../../lib/auth";
import {
  OAUTH_COOKIE,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  clearCookieHeader,
  cookieHeader,
  sameState,
  sessionSecret,
  signSession,
  verifyOAuthState,
} from "../../../../lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const parameters = new URL(request.url).searchParams;
  const handshakeToken = (await cookies()).get(OAUTH_COOKIE)?.value;
  // The handshake is single-use whatever happens next.
  const drop = clearCookieHeader(OAUTH_COOKIE);

  const secret = sessionSecret();
  const google = googleConfig();
  if (!secret || !google)
    return authError(
      503,
      "ระบบลงชื่อเข้าใช้ยังไม่พร้อมใช้งาน กรุณาติดต่อเจ้าของร้าน",
      [drop],
    );

  if (parameters.get("error"))
    return authError(400, "การลงชื่อเข้าใช้ถูกยกเลิก กรุณาลองใหม่อีกครั้ง", [
      drop,
    ]);

  const handshake = await verifyOAuthState(handshakeToken, secret);
  const state = parameters.get("state") || "";
  const code = parameters.get("code") || "";
  if (!handshake || !code || !sameState(handshake.state, state))
    return authError(
      400,
      "คำขอลงชื่อเข้าใช้ไม่ถูกต้องหรือหมดอายุแล้ว กรุณาลองใหม่อีกครั้ง",
      [drop],
    );

  let exchanged: { id_token?: unknown };
  try {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: google.clientId,
        client_secret: google.clientSecret,
        redirect_uri: redirectUri(request),
        code_verifier: handshake.verifier,
      }),
    });
    if (!response.ok) throw new Error(`token endpoint ${response.status}`);
    exchanged = await response.json();
  } catch (error) {
    console.error(
      "PAWPAL could not exchange the Google authorization code",
      error instanceof Error ? error.message : "Unknown error",
    );
    return authError(
      502,
      "ติดต่อ Google ไม่สำเร็จ กรุณาลองลงชื่อเข้าใช้อีกครั้ง",
      [drop],
    );
  }

  const identity =
    typeof exchanged.id_token === "string"
      ? identityFromIdToken(exchanged.id_token, google.clientId)
      : null;
  if (!identity)
    return authError(
      403,
      "ใช้บัญชี Google นี้ไม่ได้ กรุณาลงชื่อเข้าใช้ด้วยบัญชีที่ยืนยันอีเมลแล้ว",
      [drop],
    );

  const session = await signSession(identity, secret);
  return redirectResponse(handshake.returnTo, [
    drop,
    cookieHeader(SESSION_COOKIE, session, SESSION_TTL_SECONDS),
  ]);
}
