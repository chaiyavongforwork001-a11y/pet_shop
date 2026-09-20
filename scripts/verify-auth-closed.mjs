// The cases that need a differently configured server than
// scripts/verify-auth.mjs, so they are run against one started on purpose.
//
//   node scripts/verify-auth-closed.mjs no-admin
//     against a dev server started with ADMIN_EMAIL unset: nobody is an
//     admin, including the account that would be one if it were set.
//
//   node scripts/verify-auth-closed.mjs production
//     against `next start` of a production build, with PAWPAL_DEV_AUTH=1
//     still set: the development sign-in provider must not exist, however
//     hard the environment tries to switch it on.
//
//   node scripts/verify-auth-closed.mjs no-secret
//     against a production build started with no SESSION_SECRET: the shop
//     refuses to mint or accept sessions rather than signing them with
//     something guessable.
//
//   node scripts/verify-auth-closed.mjs google
//     against a production build configured with a Google client: the
//     authorization redirect carries PKCE and a signed handshake cookie, and
//     the callback refuses anything that does not match it.
//
// TEST_BASE_URL selects the server.
import assert from "node:assert/strict";

const mode = process.argv[2];
const modes = ["no-admin", "production", "no-secret", "google"];
if (!modes.includes(mode))
  throw Error(`Usage: verify-auth-closed.mjs ${modes.join("|")}`);
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3215";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw Error("Local test only");

let checks = 0;
function check(value, message) {
  assert.ok(value, message);
  checks += 1;
  console.log("PASS", message);
}

async function get(path, headers = {}) {
  const response = await fetch(base + path, { redirect: "manual", headers });
  let json;
  try {
    json = await response.clone().json();
  } catch {}
  return { status: response.status, json, response };
}

if (mode === "no-admin") {
  const { devSession } = await import("./dev-session.mjs");
  const anybody = await devSession(base, {
    sub: "closed-admin-probe",
    email: "dev@pawpal.test",
    name: "Would-be admin",
  });
  const owner = await devSession(base, {
    sub: "closed-owner-probe",
    email: "owner@pawpal.test",
    name: "Also not an admin",
  });

  for (const [who, cookie] of [
    ["the usual dev admin address", anybody],
    ["some other address", owner],
  ]) {
    const result = await get("/api/admin", { cookie });
    check(
      result.status === 403 &&
        result.json?.error ===
          "บัญชีนี้ไม่มีสิทธิ์แอดมิน กรุณาใช้บัญชีที่เจ้าของร้านกำหนด",
      `ADMIN_EMAIL unset: ${who} is denied admin -> 403`,
    );
  }
  check(
    (await get("/api/admin/upload", { cookie: anybody })).status === 403,
    "ADMIN_EMAIL unset: admin upload denied -> 403",
  );
  check(
    (await get("/api/admin")).status === 401,
    "ADMIN_EMAIL unset: a signed-out visitor is still 401, not 403",
  );
}

if (mode === "production") {
  for (const path of [
    "/auth/dev",
    "/auth/dev?return_to=/",
    "/auth/dev?email=owner@pawpal.test",
  ]) {
    const result = await get(path);
    check(
      result.status === 404,
      `production build: GET ${path} -> 404 (got ${result.status})`,
    );
    check(
      !(result.response.headers.getSetCookie?.() ?? []).some((c) =>
        c.startsWith("pawpal_session="),
      ),
      `production build: GET ${path} sets no session cookie`,
    );
  }
  const posted = await fetch(`${base}/auth/dev`, {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "email=owner@pawpal.test&return_to=/",
  });
  check(posted.status === 404, "production build: POST /auth/dev -> 404");
  check(
    !(posted.headers.getSetCookie?.() ?? []).some((c) =>
      c.startsWith("pawpal_session="),
    ),
    "production build: POST /auth/dev sets no session cookie",
  );

  const signIn = await get("/signin?return_to=/");
  const location = signIn.response.headers.get("location") || "";
  check(
    !location.startsWith("/auth/dev"),
    `production build: /signin does not fall back to the dev provider (${signIn.status} ${location || "no redirect"})`,
  );

  check(
    (
      await get("/api/admin", {
        "oai-authenticated-user-id": "attacker",
        "oai-authenticated-user-email": "dev@pawpal.test",
      })
    ).status === 401,
    "production build: forged oai-authenticated headers -> 401",
  );
}

if (mode === "no-secret") {
  const signIn = await get("/signin?return_to=/");
  check(
    signIn.status === 503,
    `no SESSION_SECRET: /signin refuses to start a sign-in -> 503 (got ${signIn.status})`,
  );
  check(
    !(signIn.response.headers.getSetCookie?.() ?? []).length,
    "no SESSION_SECRET: /signin sets no cookie at all",
  );
  check(
    (await get("/auth/google/callback?code=x&state=y")).status === 503,
    "no SESSION_SECRET: the callback refuses to exchange anything -> 503",
  );
  // A cookie that was valid under some other secret must not be honoured here.
  const borrowed = process.env.PAWPAL_BORROWED_SESSION;
  if (borrowed)
    check(
      (await get("/api/orders", { cookie: borrowed })).status === 401,
      "no SESSION_SECRET: a session signed elsewhere is not accepted -> 401",
    );
  check(
    (await get("/api/admin")).status === 401,
    "no SESSION_SECRET: admin is signed out, not open",
  );
}

if (mode === "google") {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  assert.ok(clientId, "GOOGLE_CLIENT_ID must be set for this mode");

  const start = await get("/signin?return_to=/orders");
  check(start.status === 302, `/signin redirects (got ${start.status})`);
  const target = new URL(start.response.headers.get("location"));
  check(
    target.origin === "https://accounts.google.com" &&
      target.pathname === "/o/oauth2/v2/auth",
    `/signin sends the visitor to Google (${target.origin}${target.pathname})`,
  );
  for (const [name, expected] of [
    ["client_id", clientId],
    ["response_type", "code"],
    ["code_challenge_method", "S256"],
    ["scope", "openid email profile"],
  ])
    check(
      target.searchParams.get(name) === expected,
      `authorization request carries ${name}=${expected}`,
    );
  check(
    (target.searchParams.get("code_challenge") || "").length >= 43,
    "authorization request carries a PKCE code_challenge",
  );
  check(
    !target.searchParams.has("code_verifier") &&
      !target.searchParams.has("client_secret"),
    "the verifier and the client secret never leave the server",
  );
  check(
    (target.searchParams.get("redirect_uri") || "").endsWith(
      "/auth/google/callback",
    ),
    `redirect_uri points back at this site (${target.searchParams.get("redirect_uri")})`,
  );

  const handshake = (start.response.headers.getSetCookie?.() ?? []).find((c) =>
    c.startsWith("pawpal_oauth="),
  );
  check(!!handshake, "the handshake is parked in a pawpal_oauth cookie");
  check(
    handshake.includes("HttpOnly") &&
      handshake.includes("SameSite=Lax") &&
      handshake.includes("Secure"),
    `the handshake cookie is HttpOnly, Lax and Secure in production (${handshake.split(";").slice(1).join(";").trim()})`,
  );
  check(
    !(start.response.headers.getSetCookie?.() ?? []).some((c) =>
      c.startsWith("pawpal_session="),
    ),
    "starting a sign-in does not itself sign anybody in",
  );

  const state = target.searchParams.get("state");
  const cookiePair = handshake.split(";")[0];
  for (const [what, query, cookie] of [
    ["no handshake cookie", `code=stolen&state=${state}`, undefined],
    [
      "a state that does not match",
      "code=stolen&state=somebody-elses",
      cookiePair,
    ],
    ["no state at all", "code=stolen", cookiePair],
    ["no code", `state=${state}`, cookiePair],
    [
      "Google reported an error",
      `error=access_denied&state=${state}`,
      cookiePair,
    ],
  ]) {
    const result = await get(
      `/auth/google/callback?${query}`,
      cookie ? { cookie } : {},
    );
    check(
      result.status === 400,
      `callback rejects ${what} -> 400 (got ${result.status})`,
    );
    check(
      !(result.response.headers.getSetCookie?.() ?? []).some((c) =>
        c.startsWith("pawpal_session="),
      ),
      `callback rejecting ${what} mints no session`,
    );
  }
}

console.log(`\n${checks} ${mode} checks passed against ${base}`);
