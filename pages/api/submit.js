/**
 * POST /api/submit
 *
 * Receives the completed buyer qualification form, then:
 *  1. Authenticates with Rex using email + password to obtain a session token
 *  2. Updates the Contact record with Motivation, Timing, Position, Notes
 *  3. Creates a Match Profile (Max Price, Min Bedrooms, Location in profile name)
 *  4. Creates a Lead with the Contact attached → Rex notifies the leads inbox
 */

const REX_API_URL = process.env.REX_API_URL; // https://api.rexsoftware.com/v1/rex
const REX_EMAIL = process.env.REX_EMAIL;
const REX_PASSWORD = process.env.REX_PASSWORD;
const REX_ACCOUNT_ID = process.env.REX_ACCOUNT_ID; // numeric account ID from Rex

/**
 * Authenticate with Rex and return a session token.
 * Rex uses email + password login; the returned token is used as a Bearer token
 * for all subsequent API calls within this request.
 */
async function getRexToken() {
  const res = await fetch(`${REX_API_URL}/Authentication/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: REX_EMAIL,
      password: REX_PASSWORD,
      // account_id is required if your email is linked to multiple Rex accounts.
      // Remove this line if you only have one account.
      account_id: REX_ACCOUNT_ID ? Number(REX_ACCOUNT_ID) : undefined,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Rex login failed: ${res.status} ${text}`);
  }

  const json = await res.json();
  // Rex returns the session token in the "result" field
  const token = json.result;
  if (!token) throw new Error("Rex login succeeded but no token returned");
  return token;
}

async function rexRequest(token, endpoint, data) {
  const res = await fetch(`${REX_API_URL}/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Rex API error on ${endpoint}: ${res.status} ${text}`);
  }

  return res.json();
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
    // 0. Get a Rex session token
    const token = await getRexToken();

    // 1. Update the Contact record with buyer qualification fields
    //    NOTE: Motivation, Timing, Position are stored as custom fields.
    //    In Rex, custom field keys follow the pattern: "Custom Field Name"
    //    Adjust the keys below to match exactly what you named them in Rex
    //    under Settings > Custom Fields > Contacts.
    await rexRequest(token, "contacts/update", {
      id: Number(contactId),
      data: {
        // Standard notes field
        note: notes || "",
        // Custom fields — update these keys to match your Rex custom field names
        custom_fields: {
          Motivation: motivation || "",
          Timing: timing || "",
          Position: position || "",
        },
      },
    });

    // 2. Create a Match Profile for this contact
    //    Location is stored in the profile name since Rex match profiles
    //    use a suburb/region selector which requires a suburb ID.
    //    If you have suburb IDs available, replace profile_name with
    //    the appropriate suburb_ids array.
    await rexRequest(token, "match_profiles/create", {
      data: {
        contact_id: Number(contactId),
        profile_name: location ? `Looking in: ${location}` : "Buyer Match Profile",
        price_to: maxPrice ? Number(maxPrice) : null,
        bedroom_min: minBedrooms ? Number(minBedrooms) : null,
      },
    });

    // 3. Create a Lead with the contact attached.
    //    Rex will notify the account's leads inbox when a new lead is created.
    //    The lead note summarises all the form responses for the agent.
    const leadNote = [
      `Location: ${location || "—"}`,
      `Max Price: ${maxPrice ? `$${Number(maxPrice).toLocaleString()}` : "—"}`,
      `Min Bedrooms: ${minBedrooms || "—"}`,
      `Motivation: ${motivation || "—"}`,
      `Timing: ${timing || "—"}`,
      `Position: ${position || "—"}`,
      notes ? `Notes: ${notes}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    await rexRequest(token, "leads/create", {
      data: {
        lead_status: "new",
        note: leadNote,
        // Link the contact to this lead
        _related: {
          lead_contacts: [{ contact_id: Number(contactId) }],
        },
      },
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Form submission error:", err);
    return res.status(500).json({ error: err.message });
  }
}
