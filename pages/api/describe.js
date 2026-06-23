/**
 * Temporary diagnostic endpoint — DELETE after use.
 * GET /api/describe
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

  const [buyerMotivation, buyerPosition, leadTypes, enquirySources, leads] = await Promise.all([
    rexPost(token, "admin-value-lists/getListValues", { list_name: "buyer_motivation" }),
    rexPost(token, "admin-value-lists/getListValues", { list_name: "buyer_position" }),
    rexPost(token, "admin-value-lists/getListValues", { list_name: "lead_type" }),
    rexPost(token, "admin-value-lists/getListValues", { list_name: "enquiry_source" }),
    rexPost(token, "leads/search", {
      limit: 1,
      extra_fields: ["lead_type", "lead_source"],
    }),
  ]);

  return res.status(200).json({ buyerMotivation, buyerPosition, leadTypes, enquirySources, leads });
}
