// The app's view of who is signed in.
//
// Successor to app/chatgpt-auth.ts, which decided identity by reading three
// unsigned `oai-authenticated-user-*` request headers injected by the OpenAI
// Sites platform. Nothing injects or strips those headers any more, so trusting
// them meant anyone could name themselves the shop owner. Identity now comes
// from a cookie this server signed (lib/session.ts) after a Google sign-in
// (app/signin, app/auth/google/callback).
//
// The shape returned here is unchanged, so every caller — lib/server.ts,
// app/api/[...path]/route.ts, app/admin/page.tsx — reads the same fields it
// always did.

import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  cookieHeader,
  sessionSecret,
  shouldRefresh,
  signSession,
  verifySession,
} from "../lib/session";

export { signInPath, signOutPath } from "../lib/auth";

export type ShopUser = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

/**
 * The signed-in visitor, or null.
 *
 * Null is the answer for every failure mode there is: no cookie, a cookie from
 * another deployment's secret, an edited payload, an expired session, or a
 * production environment with no SESSION_SECRET. Nothing a client sends can
 * make this return a user the server did not sign.
 */
export async function getUser(): Promise<ShopUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const payload = await verifySession(token, sessionSecret());
  if (!payload) return null;
  return {
    userId: payload.sub,
    displayName: payload.name || payload.email,
    email: payload.email,
    fullName: payload.name,
  };
}

/**
 * A Set-Cookie value re-issuing the current session, or null when there is
 * nothing to do.
 *
 * Sessions slide rather than expiring under an active shopper: once one is
 * past half its life, the next API request it makes carries a fresh one back.
 * A visitor who stops using the shop still expires on schedule.
 */
export async function sessionRefreshCookie(): Promise<string | null> {
  const secret = sessionSecret();
  if (!secret) return null;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const payload = await verifySession(token, secret);
  if (!payload || !shouldRefresh(payload)) return null;
  const refreshed = await signSession(
    { sub: payload.sub, email: payload.email, name: payload.name },
    secret,
  );
  return cookieHeader(SESSION_COOKIE, refreshed, SESSION_TTL_SECONDS);
}
