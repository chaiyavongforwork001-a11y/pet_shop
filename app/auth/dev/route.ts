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
// so a deployed build looks like a build that never had the route at all.
//
//   node --run dev:next                      # with PAWPAL_DEV_AUTH=1 set
//   curl -i '/auth/dev?email=a@b.test&return_to=/'

import {
  DEV_USER,
  authError,
  devAuthEnabled,
  redirectResponse,
  safeReturnPath,
} from "../../../lib/auth";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  cookieHeader,
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

async function devSignIn(request: Request, status: number): Promise<Response> {
  if (!devAuthEnabled()) return notFound();

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
    [cookieHeader(SESSION_COOKIE, session, SESSION_TTL_SECONDS)],
    status,
  );
}

export async function GET(request: Request): Promise<Response> {
  return devSignIn(request, 302);
}

export async function POST(request: Request): Promise<Response> {
  if (!devAuthEnabled()) return notFound();
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return authError(403, "ไม่อนุญาตคำขอจากเว็บไซต์อื่น");
  return devSignIn(request, 303);
}
