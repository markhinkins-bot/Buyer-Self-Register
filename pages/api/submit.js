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

    // Full plain-text summary — used in the lead note and qualification notes
    // so agents see everything regardless of whether enum fields are set.
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

    // 1. Update the Contact's buyer motivation sub-record.
    //    buyer_timing accepts the label string directly.
    //    buyer_motivation_ids / buyer_position_ids require Rex integer list
    //    value IDs — since we don't have those, motivation and position are
    //    stored in buyer_qualification_notes instead (also in the lead note).
    await rexPost(token, "contacts/update", {
      data: {
        id: Number(contactId),
        _related: {
          contact_buyer_motivation: [
            {
              buyer_timing: timing || null,
              buyer_qualification_notes: [
                motivation ? `Motivation: ${motivation}` : null,
                position ? `Position: ${position}` : null,
                notes || null,
              ]
                .filter(Boolean)
                .join("\n") || null,
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
    //    Rex notifies the leads inbox when a new lead is created.
    //    The note contains the full form summary.
    await rexPost(token, "leads/create", {
      data: {
        note: summary,
        contact: { id: Number(contactId) },
      },
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Form submission error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
