/**
 * POST /api/submit
 *
 * 1. Authenticates with Rex (email + password → session token)
 * 2. Updates the Contact's buyer motivation sub-record
 * 3. Creates a Match Profile linked to the contact
 * 4. Creates a Lead with the contact attached
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
  const token = json.result;
  if (!token) throw new Error("Rex login failed — check REX_EMAIL and REX_PASSWORD");
  return token;
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

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Rex API error on ${endpoint}: ${res.status} ${text}`);
  }

  const json = await res.json();
  if (json.error) {
    throw new Error(`Rex API error on ${endpoint}: ${json.error.message}`);
  }

  return json;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    contactId,
    location,
    maxPrice,
    minBedrooms,
    motivation,
    timing,
    position,
    notes,
  } = req.body;

  if (!contactId) {
    return res.status(400).json({ error: "Missing contactId" });
  }

  try {
    const token = await getRexToken();

    // Look up lead_type and enquiry_source list value IDs dynamically so we
    // don't need to hardcode account-specific integers.
    const [leadTypeList, enquirySourceList] = await Promise.all([
      rexPost(token, "account-list-values/search", {
        criteria: [{ name: "type", type: "=", value: "lead_type" }],
        limit: 50,
      }),
      rexPost(token, "account-list-values/search", {
        criteria: [{ name: "type", type: "=", value: "enquiry_source" }],
        limit: 50,
      }),
    ]);

    const leadTypeRows = leadTypeList.result?.rows || [];
    const enquirySourceRows = enquirySourceList.result?.rows || [];

    const generalType = leadTypeRows.find((v) => v.text === "General");
    const phoneAgentSource = enquirySourceRows.find((v) => v.text === "Phone Agent");

    // Full plain-text summary — used in the lead note.
    const summary = [
      `Location: ${location || "—"}`,
      `Max Price: ${maxPrice ? `£${Number(maxPrice).toLocaleString()}` : "—"}`,
      `Min Bedrooms: ${minBedrooms || "—"}`,
      `Motivation: ${motivation || "—"}`,
      `Timing: ${timing || "—"}`,
      `Position: ${position || "—"}`,
      notes ? `Notes: ${notes}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    // 1. Update the Contact record.
    //    buyer_motivation and buyer_position are top-level string fields on
    //    the contact (confirmed from live record data). buyer_timing and
    //    buyer_qualification_notes sit inside the contact_buyer_motivation
    //    sub-record alongside them.
    await rexPost(token, "contacts/update", {
      data: {
        id: Number(contactId),
        buyer_motivation: motivation || null,
        buyer_position: position || null,
        _related: {
          contact_buyer_motivation: [
            {
              buyer_timing: timing || null,
              buyer_qualification_notes: notes || null,
            },
          ],
        },
      },
    });

    // 2. Create a Match Profile linked to this contact.
    //    Location goes in the profile name (free text) — Rex's location
    //    selector requires suburb IDs which we don't have from a text field.
    await rexPost(token, "match-profiles/create", {
      data: {
        contact_id: Number(contactId),
        profile_name: location ? `Looking in: ${location}` : "Buyer Profile",
        category: "residential_sale",
        price: { max: maxPrice ? Number(maxPrice) : null },
        attr_bedrooms: { min: minBedrooms ? Number(minBedrooms) : null },
      },
    });

    // 3. Create a Lead with the contact attached.
    //    lead_type = General, lead_source = Phone Agent (looked up above).
    await rexPost(token, "leads/create", {
      data: {
        note: summary,
        contact: { id: Number(contactId) },
        lead_type: generalType ? { id: generalType.id } : undefined,
        lead_source: phoneAgentSource ? { id: phoneAgentSource.id } : undefined,
      },
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Form submission error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
