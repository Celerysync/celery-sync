import { useState } from "react";
import C from "../lib/colors.js";
import { supabase } from "../lib/supabase.js";
import { HEALTH_CONSENT_TEXT, consentMetadata } from "../lib/consent.js";

// Shown once to accounts created before sign-up asked for these agreements
// (and to anyone whose account lacks them). Same wording as sign-up
// (lib/consent.js); agreeing records the version and time on the account.
export default function ConsentUpdate({ authUser, onSignOut }) {
  const meta = authUser?.user_metadata || {};
  const [terms, setTerms] = useState(!!meta.age_confirmed_18);
  const [health, setHealth] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const agree = async () => {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ data: consentMetadata() });
    if (err) {
      setError("That didn't save — please check your connection and try again.");
      setBusy(false);
    }
    // On success the auth listener refreshes the user and the app opens.
  };

  const row = (checked, onChange, children) => (
    <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, color: C.charcoal, lineHeight: 1.55, cursor: "pointer" }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 22, height: 22, marginTop: 1, flexShrink: 0, accentColor: C.sageDark }}
      />
      <span>{children}</span>
    </label>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.cream, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ maxWidth: 440, width: "100%", background: C.surface, borderRadius: 22, padding: "26px 22px", boxShadow: "0 8px 32px rgba(0,0,0,0.08)", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 34 }}>🌿</div>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 20, color: C.charcoal }}>A quick update</div>
        <div style={{ fontSize: 14, color: C.mid, lineHeight: 1.6 }}>
          We've written clear Terms and a Privacy Policy, and we now ask everyone to agree to how their
          health details are kept. Nothing about your account changes.
        </div>
        {row(terms, setTerms, <>
          I'm 18 or over, and I agree to the{" "}
          <a href="/terms.html" target="_blank" rel="noopener" style={{ color: C.sageDark }}>Terms of Use</a> and{" "}
          <a href="/privacy.html" target="_blank" rel="noopener" style={{ color: C.sageDark }}>Privacy Policy</a>.
        </>)}
        {row(health, setHealth, HEALTH_CONSENT_TEXT)}
        {error && <div style={{ fontSize: 13, color: C.terracotta }}>{error}</div>}
        <button
          onClick={agree}
          disabled={busy || !terms || !health}
          style={{
            padding: "14px", borderRadius: 40, border: "none",
            background: busy || !terms || !health ? C.muted : C.sageDark, color: C.white,
            fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 16,
            cursor: busy || !terms || !health ? "default" : "pointer",
          }}
        >
          {busy ? "Saving…" : "Agree and continue"}
        </button>
        <button
          onClick={onSignOut}
          style={{ background: "none", border: "none", color: C.muted, fontSize: 13, cursor: "pointer", fontFamily: "Georgia,serif", textDecoration: "underline" }}
        >
          Not now — sign out
        </button>
      </div>
    </div>
  );
}
