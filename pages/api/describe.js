**
 * Temporary diagnostic endpoint — DELETE after use.
 * GET /api/describe  → returns Rex field model for contacts, match-profiles, and leads
 * Also reads one real contact so we can see the actual field structure returned.
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
 
  const [contactsModel, matchProfilesModel, leadsModel, sampleContact, sampleLead] = await Promise.all([
    rexPost(token, "contacts/describeModel"),
    rexPost(token, "match-profiles/describeModel"),
    rexPost(token, "leads/describeModel"),
    // Read a real contact to see actual field structure
    rexPost(token, "contacts/search", { limit: 1 }),
    // Read a real lead to see actual field structure
    rexPost(token, "leads/search", { limit: 1 }),
  ]);
 
  return res.status(200).json({
    contactsModel,
    matchProfilesModel,
    leadsModel,
    sampleContact,
    sampleLead,
  });
}
 
