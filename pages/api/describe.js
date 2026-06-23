/**
 * Temporary diagnostic endpoint — DELETE after use.
 * GET /api/describe  → returns Rex schema for contacts, match_profiles, and leads
 */

const REX_API_URL = process.env.REX_API_URL;
const REX_EMAIL = process.env.REX_EMAIL;
const REX_PASSWORD = process.env.REX_PASSWORD;
const REX_ACCOUNT_ID = process.env.REX_ACCOUNT_ID;

async function getRexToken() {
  const res = await fetch(`${REX_API_URL}/Authentication/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: REX_EMAIL,
      password: REX_PASSWORD,
      account_id: REX_ACCOUNT_ID ? Number(REX_ACCOUNT_ID) : undefined,
    }),
  });
  const json = await res.json();
  return json.result;
}

async function rexDescribe(token, resource) {
  const res = await fetch(`${REX_API_URL}/${resource}/describe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });
  return res.json();
}

export default async function handler(req, res) {
  const token = await getRexToken();
  const [contacts, matchProfiles, leads] = await Promise.all([
    rexDescribe(token, "contacts"),
    rexDescribe(token, "match-profiles"),
    rexDescribe(token, "leads"),
  ]);
  return res.status(200).json({ contacts, matchProfiles, leads });
}
