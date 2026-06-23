/**
 * Temporary diagnostic endpoint — DELETE after use.
 * GET /api/describe  → reads real records to reveal exact field names
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
 
async function rexPost(token, endpoint, body = {}) {
  const res = await fetch(`${REX_API_URL}/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}
 
export default async function handler(req, res) {
  const token = await getRexToken();
 
  // Search for one contact, one lead, one match profile — read their full structure
  const [contacts, leads, matchProfiles] = await Promise.all([
    rexPost(token, "contacts/search", { limit: 1, extra_fields: ["custom_fields"] }),
    rexPost(token, "leads/search", { limit: 1 }),
    rexPost(token, "match-profiles/search", { limit: 1 }),
  ]);
 
  return res.status(200).json({ contacts, leads, matchProfiles });
}
 
