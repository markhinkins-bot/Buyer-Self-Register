import { useRouter } from "next/router";
import { useState } from "react";

const MOTIVATION_OPTIONS = [
  "First Time Buyer",
  "Downsizing",
  "Upsizing",
  "Investor",
  "Buy to Let",
  "Let to Buy",
  "Change of Area",
  "Builder / Developer",
];

const TIMING_OPTIONS = [
  "1 - 3 months",
  "3 - 6 months",
  "6 - 12 months",
  "12+ months",
];

const POSITION_OPTIONS = [
  "First Time Buyer",
  "Cash Buyer",
  "Mortgage Required",
  "Investor",
  "Nothing to Sell",
  "Property to Sell",
  "Need to Sell",
  "Property On Market",
  "Property On Market - Sold Subject to Contract",
  "Property On Market - Other Agent",
  "Property Not on Market",
  "Looking to Rent",
  "Living at Home",
  "Living in Rental",
];

export default function BuyerForm() {
  const router = useRouter();
  const { cid } = router.query;

  const [form, setForm] = useState({
    location: "",
    maxPrice: "",
    minBedrooms: "",
    motivation: "",
    timing: "",
    position: "",
    notes: "",
  });

  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState("");

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!cid) {
      setErrorMsg("Invalid link — no contact ID found. Please use the link from your email.");
      setStatus("error");
      return;
    }

    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: cid, ...form }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Something went wrong");
      }

      setStatus("success");
    } catch (err) {
      setErrorMsg(err.message);
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <Layout>
        <div style={styles.successBox}>
          <h2 style={styles.successHeading}>Thanks — you&apos;re all set!</h2>
          <p style={styles.successText}>
            We&apos;ve noted your preferences and one of our team will be in touch shortly.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 style={styles.heading}>Help us find the right property for you</h1>
      <p style={styles.subheading}>
        Answer a few quick questions so we can match you with the best options.
      </p>

      <form onSubmit={handleSubmit} style={styles.form}>
        <Field label="Preferred location" hint="Suburb, area or postcode">
          <input
            name="location"
            value={form.location}
            onChange={handleChange}
            placeholder="e.g. Bondi, Eastern Suburbs"
            style={styles.input}
            required
          />
        </Field>

        <Field label="Maximum purchase price">
          <input
            name="maxPrice"
            type="number"
            value={form.maxPrice}
            onChange={handleChange}
            placeholder="e.g. 750000"
            style={styles.input}
            min="0"
            required
          />
        </Field>

        <Field label="Minimum bedrooms">
          <input
            name="minBedrooms"
            type="number"
            value={form.minBedrooms}
            onChange={handleChange}
            placeholder="e.g. 3"
            style={styles.input}
            min="0"
            max="10"
            required
          />
        </Field>

        <Field label="What is your main motivation for buying?">
          <select
            name="motivation"
            value={form.motivation}
            onChange={handleChange}
            style={styles.input}
            required
          >
            <option value="">Select one…</option>
            {MOTIVATION_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </Field>

        <Field label="When are you looking to buy?">
          <select
            name="timing"
            value={form.timing}
            onChange={handleChange}
            style={styles.input}
            required
          >
            <option value="">Select one…</option>
            {TIMING_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </Field>

        <Field label="Where are you in the process?">
          <select
            name="position"
            value={form.position}
            onChange={handleChange}
            style={styles.input}
            required
          >
            <option value="">Select one…</option>
            {POSITION_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </Field>

        <Field label="Anything else we should know?" hint="Optional">
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            placeholder="Specific requirements, deal-breakers, etc."
            rows={4}
            style={{ ...styles.input, resize: "vertical" }}
          />
        </Field>

        {status === "error" && (
          <p style={styles.error}>{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={status === "submitting"}
          style={status === "submitting" ? { ...styles.button, opacity: 0.6 } : styles.button}
        >
          {status === "submitting" ? "Submitting…" : "Submit"}
        </button>
      </form>
    </Layout>
  );
}

function Layout({ children }) {
  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
               background: #f5f5f5; color: #1a1a1a; }
      `}</style>
      <main style={styles.container}>{children}</main>
    </>
  );
}

function Field({ label, hint, children }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>
        {label}
        {hint && <span style={styles.hint}> — {hint}</span>}
      </label>
      {children}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 560,
    margin: "48px auto",
    padding: "32px 24px",
    background: "#fff",
    borderRadius: 12,
    boxShadow: "0 2px 16px rgba(0,0,0,0.08)",
  },
  heading: {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 8,
  },
  subheading: {
    fontSize: 15,
    color: "#555",
    marginBottom: 28,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: 600,
  },
  hint: {
    fontWeight: 400,
    color: "#888",
  },
  input: {
    padding: "10px 12px",
    fontSize: 15,
    border: "1px solid #ddd",
    borderRadius: 8,
    outline: "none",
    width: "100%",
    background: "#fafafa",
  },
  button: {
    marginTop: 8,
    padding: "12px 24px",
    fontSize: 16,
    fontWeight: 600,
    background: "#1a1a1a",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
  error: {
    fontSize: 14,
    color: "#c0392b",
    background: "#fdf0ef",
    padding: "10px 12px",
    borderRadius: 8,
  },
  successBox: {
    textAlign: "center",
    padding: "24px 0",
  },
  successHeading: {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 12,
  },
  successText: {
    fontSize: 15,
    color: "#555",
  },
};
