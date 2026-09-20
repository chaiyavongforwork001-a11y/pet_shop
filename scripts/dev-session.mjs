// Signs a verification script in to a locally running PAWPAL.
//
// The scripts used to name themselves in `oai-authenticated-user-*` headers,
// which is exactly the forgery this phase removed. They now do what a browser
// does: ask the development-only provider at /auth/dev for a session and keep
// the signed cookie it sets. The server verifies that cookie's HMAC on every
// request, so these scripts exercise the real identity path rather than a
// bypass around it.
//
// /auth/dev exists only when the server was started with PAWPAL_DEV_AUTH=1,
// outside production, with no NETLIFY environment variable. Against anything
// else this throws, which is the point.

/**
 * @param {string} base  e.g. "http://127.0.0.1:3213"
 * @param {{sub?: string, email?: string, name?: string}} [user]
 * @returns {Promise<string>} the `pawpal_session=...` cookie pair
 */
export async function devSession(base, user = {}) {
  const url = new URL("/auth/dev", base);
  url.searchParams.set("return_to", "/");
  for (const field of ["sub", "email", "name"])
    if (user[field]) url.searchParams.set(field, user[field]);

  const response = await fetch(url, { redirect: "manual" });
  if (response.status !== 302)
    throw new Error(
      `/auth/dev answered ${response.status}; start the server with PAWPAL_DEV_AUTH=1`,
    );

  const cookie = (response.headers.getSetCookie?.() ?? [])
    .map((value) => value.split(";")[0])
    .find((pair) => /^(__Host-)?pawpal_session=/.test(pair));
  if (!cookie) throw new Error("/auth/dev set no pawpal_session cookie");
  return cookie;
}
