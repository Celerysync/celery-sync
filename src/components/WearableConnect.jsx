import { useState, useEffect, useCallback } from "react";
import C from "../lib/colors.js";
import { Card, Btn } from "./ui.jsx";

const TODAY = new Date().toISOString().split("T")[0];

const WEARABLES = [
  {
    id: "oura",
    name: "Oura Ring",
    emoji: "⭕",
    desc: "Automatic sync — sleep, HRV, readiness, heart rate pulled daily",
    type: "auto",
    color: C.sage,
    metrics: ["Sleep hours & quality", "Morning HRV", "Resting heart rate", "Readiness score"],
    howTo: null,
  },
  {
    id: "apple_watch",
    name: "Apple Watch / iPhone",
    emoji: "⌚",
    desc: "Automatic — a one-time iPhone Shortcut sends last night's sleep every morning",
    type: "auto",
    color: "#1C1C1E",
    metrics: ["Sleep hours (from the Health app)", "Manual extras anytime: HRV, resting HR, steps"],
    howTo: "Open the Health app on your iPhone → Browse → Sleep / Heart / Activity → enter the numbers below",
  },
  {
    id: "garmin",
    name: "Garmin",
    emoji: "🟠",
    desc: "Log your Garmin Connect data manually after checking the app",
    type: "manual",
    color: "#007CC3",
    metrics: ["Sleep (Garmin Connect → Sleep)", "HRV (Health Stats → HRV)", "Resting HR (Health Stats)"],
    howTo: "Open Garmin Connect → Today → check Sleep, Health Stats, and Body Battery → enter below",
  },
  {
    id: "whoop",
    name: "Whoop",
    emoji: "⚡",
    desc: "Log your Whoop data manually — Recovery, sleep, and HRV",
    type: "manual",
    color: "#00A6FF",
    metrics: ["Sleep hours", "HRV", "Resting HR"],
    howTo: "Open Whoop app → Today → check your Recovery, Sleep, and Health Monitor stats → enter below",
  },
  {
    id: "fitbit",
    name: "Fitbit / Google Fit",
    emoji: "💙",
    desc: "Log your Fitbit or Google Fit data manually",
    type: "manual",
    color: "#00B0B9",
    metrics: ["Sleep hours & quality", "Resting HR", "HRV (if your device shows it)"],
    howTo: "Open Fitbit app → Today tab → check Sleep, Heart Rate, and Activity → enter below",
  },
  {
    id: "samsung",
    name: "Samsung Galaxy Watch",
    emoji: "📿",
    desc: "Log your Samsung Health data manually",
    type: "manual",
    color: "#1428A0",
    metrics: ["Sleep hours & quality", "Resting HR", "HRV (if your device shows it)"],
    howTo: "Open Samsung Health app → Today → check Sleep, Heart Rate, and Activity → enter below",
  },
];

// Apple Health has no cloud API (native apps only) — a personal iOS Shortcut
// automation is the no-app path to automatic sync. This block issues the
// user's private ingest link and walks them through building the Shortcut.
function AppleShortcutSetup({ authUser, connected, lastSync, fmtSync, onTokenIssued }) {
  const [ingestToken, setIngestToken] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [copied, setCopied] = useState(false);

  const issueToken = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/wearable/shortcut/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: authUser.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't create your link");
      setIngestToken(data.token);
      onTokenIssued?.();
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  };

  const ingestUrl = `${window.location.origin}/api/wearable/shortcut/ingest`;

  return (
    <div style={{ marginBottom: 14 }}>
      {connected && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.sage }} />
          <div style={{ fontSize: 12, color: C.mid }}>Shortcut connected · Last data received: {fmtSync(lastSync)}</div>
        </div>
      )}
      {!ingestToken ? (
        <Btn full onClick={issueToken} disabled={busy} color={C.sageDark}>
          {busy ? "One moment…" : connected ? "Show my setup details again" : "Set up automatic sleep sync →"}
        </Btn>
      ) : (
        <div style={{ background: C.mist, borderRadius: 10, padding: "12px 14px", fontSize: 12, color: C.charcoal, lineHeight: 1.7 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Build this Shortcut once on your iPhone (~3 min):</div>
          1. Open the <strong>Shortcuts</strong> app → <strong>+</strong> to create a new shortcut{"\n"}
          2. Add action <strong>Find Health Samples</strong> → type <strong>Sleep</strong>, where <strong>Value is Asleep</strong>, <strong>Start Date is in the last 1 day</strong>{"\n"}
          3. Add <strong>Calculate Statistics</strong> → <strong>Sum</strong> of the samples' <strong>Duration</strong> (in minutes){"\n"}
          4. Add <strong>Calculate</strong> → divide that by <strong>60</strong>{"\n"}
          5. Add <strong>Format Date</strong> → Current Date, custom format <strong>yyyy-MM-dd</strong>{"\n"}
          6. Add <strong>Get Contents of URL</strong> → the URL below, Method <strong>POST</strong>, Request Body <strong>JSON</strong>, with fields:{"\n"}
          &nbsp;&nbsp;&nbsp;<strong>token</strong> = your key below · <strong>sleep_hours</strong> = the Calculate result · <strong>date</strong> = the formatted date{"\n"}
          7. In <strong>Automation</strong> → new personal automation → <strong>Time of Day</strong>, e.g. 9:00am daily → <strong>Run Immediately</strong> → pick this shortcut
          <div style={{ marginTop: 10, fontWeight: 700 }}>Your URL:</div>
          <code style={{ fontSize: 11, wordBreak: "break-all", display: "block", background: C.white, borderRadius: 6, padding: "6px 8px", marginTop: 3 }}>{ingestUrl}</code>
          <div style={{ marginTop: 8, fontWeight: 700 }}>Your private key (keep it to yourself):</div>
          <code style={{ fontSize: 11, wordBreak: "break-all", display: "block", background: C.white, borderRadius: 6, padding: "6px 8px", marginTop: 3 }}>{ingestToken}</code>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(`URL: ${ingestUrl}\nKey: ${ingestToken}`).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 3000);
              });
            }}
            style={{
              marginTop: 10, width: "100%", padding: "9px", borderRadius: 8,
              border: `1.5px solid ${C.sage}`, background: copied ? C.sage : "none",
              color: copied ? C.white : C.sageDark, fontFamily: "Georgia,serif",
              fontWeight: 700, fontSize: 12, cursor: "pointer",
            }}
          >
            {copied ? "✓ Copied!" : "📋 Copy URL + key"}
          </button>
        </div>
      )}
      {err && <div style={{ fontSize: 12, color: C.terracotta, marginTop: 8 }}>{err}</div>}
      <div style={{ fontSize: 11, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
        Once the automation runs each morning, last night's sleep appears in your check-in
        automatically. Prefer to type it in? Manual entry still works below.
      </div>
    </div>
  );
}

function ManualEntryForm({ wearable, authUser, onSaved }) {
  const [form, setForm] = useState({ sleep_hours: "", sleep_quality: "", hrv: "", resting_hr: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    const payload = { userId: authUser.id, date: TODAY, source: wearable.id };
    if (form.sleep_hours) payload.sleep_hours = form.sleep_hours;
    if (form.sleep_quality) payload.sleep_quality = form.sleep_quality;
    if (form.hrv) payload.hrv = form.hrv;
    if (form.resting_hr) payload.resting_hr = form.resting_hr;
    try {
      const res = await fetch(`/api/wearable/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { key: "sleep_hours", label: "Sleep hours", placeholder: "e.g. 7.5", type: "number", step: "0.1" },
    { key: "sleep_quality", label: "Sleep quality (1–5)", placeholder: "1 = poor, 5 = great", type: "number" },
    { key: "hrv", label: "HRV (ms)", placeholder: "e.g. 45", type: "number" },
    { key: "resting_hr", label: "Resting heart rate", placeholder: "e.g. 58 bpm", type: "number" },
  ];

  return (
    <div style={{ marginTop: 12 }}>
      {wearable.howTo && (
        <div style={{ background: C.sageLight, borderRadius: 10, padding: "10px 12px", marginBottom: 12, fontSize: 12, color: C.sageDark, lineHeight: 1.6 }}>
          💡 {wearable.howTo}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        {fields.map(f => (
          <div key={f.key}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>{f.label}</div>
            <input
              type={f.type}
              step={f.step || "1"}
              value={form[f.key]}
              onChange={e => setForm(fm => ({ ...fm, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              style={{
                width: "100%", boxSizing: "border-box", padding: "8px 10px",
                borderRadius: 8, border: `1.5px solid ${C.border}`,
                fontFamily: "Georgia,serif", fontSize: 13, outline: "none",
              }}
            />
          </div>
        ))}
      </div>
      {error && <div style={{ fontSize: 12, color: C.terracotta, marginBottom: 8 }}>{error}</div>}
      <Btn full onClick={save} disabled={saving} color={wearable.color}>
        {saving ? "Saving…" : `Save today's ${wearable.name} data →`}
      </Btn>
    </div>
  );
}

export default function WearableConnect({ authUser }) {
  const [status, setStatus] = useState(null);
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [manualSuccess, setManualSuccess] = useState(null);

  const loadStatus = useCallback(async () => {
    if (!authUser?.id) return;
    try {
      const res = await fetch(`/api/wearable/status/${authUser.id}`);
      const data = await res.json();
      setStatus(data.tokens || []);
    } catch {
      setStatus([]);
    }
  }, [authUser?.id]);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const ouraToken = status?.find((t) => t.source === "oura");
  const shortcutToken = status?.find((t) => t.source === "shortcut");

  const connectOura = async () => {
    if (!token.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/wearable/oura/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: authUser.id, token: token.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Connection failed");
      setToken("");
      setSuccess("Oura Ring connected! Syncing your data now…");
      await loadStatus();
      await syncNow();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const disconnectOura = async () => {
    setSaving(true);
    await fetch(`/api/wearable/oura/token`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: authUser.id }),
    });
    await loadStatus();
    setSaving(false);
    setSuccess("Oura disconnected.");
  };

  const syncNow = async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch(`/api/wearable/oura/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: authUser.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(`Synced ${data.days} days of Oura data — your healing trends are updated!`);
      await loadStatus();
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const fmtSync = (ts) => {
    if (!ts) return "Never";
    const d = new Date(ts);
    const diffH = Math.floor((Date.now() - d) / 3600000);
    if (diffH < 1) return "Just now";
    if (diffH < 24) return `${diffH}h ago`;
    return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  };

  if (status === null) return (
    <Card>
      <div style={{ fontSize: 13, color: C.muted }}>Loading wearable status…</div>
    </Card>
  );

  return (
    <Card>
      <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal, marginBottom: 4 }}>
        💓 Wearable Integration
      </div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 16, lineHeight: 1.5 }}>
        Connect your wearable so sleep, HRV, and readiness land in your daily check-ins by themselves. Oura Ring and Apple Watch sync automatically; the others use quick manual entry.
      </div>

      {(success || manualSuccess) && (
        <div style={{ marginBottom: 12, padding: "10px 12px", background: C.sageLight, border: `1px solid ${C.sage}40`, borderRadius: 10, fontSize: 12, color: C.sageDark }}>
          ✓ {success || manualSuccess}
        </div>
      )}
      {error && (
        <div style={{ marginBottom: 12, padding: "10px 12px", background: C.terracottaLight, border: `1px solid ${C.terracotta}40`, borderRadius: 10, fontSize: 12, color: C.terracotta }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {WEARABLES.map(w => {
          const isExpanded = expanded === w.id;
          const isOuraConnected = w.id === "oura" && ouraToken;
          const isConnected = isOuraConnected || (w.id === "apple_watch" && !!shortcutToken);
          const oura = w.id === "oura";

          return (
            <div key={w.id} style={{
              border: `1.5px solid ${isConnected ? C.sage : C.border}`,
              borderRadius: 14, overflow: "hidden",
            }}>
              {/* Header row */}
              <button
                onClick={() => setExpanded(isExpanded ? null : w.id)}
                style={{
                  width: "100%", padding: "12px 14px", background: isConnected ? C.sageLight : C.white,
                  border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                  touchAction: "manipulation", textAlign: "left",
                }}
              >
                <div style={{ fontSize: 22, flexShrink: 0 }}>{w.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal }}>{w.name}</div>
                    {isConnected && (
                      <div style={{ fontSize: 10, background: C.sage, color: "#fff", borderRadius: 10, padding: "1px 7px", fontWeight: 700 }}>
                        Connected
                      </div>
                    )}
                    {w.type === "auto" && !isConnected && (
                      <div style={{ fontSize: 10, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 10, padding: "1px 7px" }}>
                        Auto sync
                      </div>
                    )}
                    {w.type === "manual" && (
                      <div style={{ fontSize: 10, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 10, padding: "1px 7px" }}>
                        Manual
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{w.desc}</div>
                </div>
                <div style={{ fontSize: 14, color: C.muted, flexShrink: 0 }}>{isExpanded ? "▲" : "▼"}</div>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div style={{ padding: "0 14px 14px", borderTop: `1px solid ${C.border}` }}>
                  {/* What we read */}
                  <div style={{ background: C.mist, borderRadius: 10, padding: "10px 12px", margin: "12px 0 12px" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.sageDark, marginBottom: 5 }}>What CelerySync reads:</div>
                    {w.metrics.map(m => (
                      <div key={m} style={{ fontSize: 11, color: C.charcoal, lineHeight: 1.6 }}>• {m}</div>
                    ))}
                  </div>

                  {/* Oura — auto connect */}
                  {oura && (
                    isOuraConnected ? (
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.sage }} />
                          <div style={{ fontSize: 12, color: C.mid }}>Last sync: {fmtSync(ouraToken.last_sync)} · Auto-syncs daily at 6:30am</div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={syncNow}
                            disabled={syncing}
                            style={{
                              flex: 1, padding: "10px", borderRadius: 10, border: `1.5px solid ${C.sage}`,
                              background: "none", color: C.sageDark, fontFamily: "Georgia,serif",
                              fontWeight: 700, fontSize: 13, cursor: syncing ? "default" : "pointer", touchAction: "manipulation",
                            }}
                          >
                            {syncing ? "Syncing…" : "Sync Now"}
                          </button>
                          <button
                            onClick={disconnectOura}
                            disabled={saving}
                            style={{
                              padding: "10px 16px", borderRadius: 10, border: `1.5px solid ${C.border}`,
                              background: "none", color: C.muted, fontFamily: "Georgia,serif",
                              fontSize: 13, cursor: saving ? "default" : "pointer", touchAction: "manipulation",
                            }}
                          >
                            Disconnect
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: 12, color: C.mid, marginBottom: 10, lineHeight: 1.7 }}>
                          1. Open <strong>cloud.ouraring.com</strong>{"\n"}
                          2. Go to <strong>Profile → Personal Access Tokens</strong>{"\n"}
                          3. Create a new token → paste it below
                        </div>
                        <textarea
                          value={token}
                          onChange={(e) => setToken(e.target.value)}
                          placeholder="Paste your Oura personal access token here…"
                          rows={2}
                          style={{
                            width: "100%", boxSizing: "border-box", padding: "10px 12px",
                            borderRadius: 10, border: `1.5px solid ${C.border}`,
                            fontFamily: "monospace", fontSize: 12, resize: "none", outline: "none", marginBottom: 10,
                          }}
                        />
                        <Btn full onClick={connectOura} disabled={saving || !token.trim()} color={C.sageDark}>
                          {saving ? "Connecting…" : "Connect Oura Ring →"}
                        </Btn>
                      </div>
                    )
                  )}

                  {/* Apple — automatic via iOS Shortcut, manual as fallback */}
                  {w.id === "apple_watch" && (
                    <AppleShortcutSetup
                      authUser={authUser}
                      connected={!!shortcutToken}
                      lastSync={shortcutToken?.last_sync}
                      fmtSync={fmtSync}
                      onTokenIssued={loadStatus}
                    />
                  )}

                  {/* All other wearables — manual entry */}
                  {!oura && (
                    <ManualEntryForm
                      wearable={w}
                      authUser={authUser}
                      onSaved={() => {
                        setManualSuccess(`${w.name} data saved! Your healing trends will update.`);
                        setExpanded(null);
                        setTimeout(() => setManualSuccess(null), 5000);
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 14, padding: "10px 12px", background: C.mist, borderRadius: 10, fontSize: 11, color: C.mid, lineHeight: 1.6 }}>
        No wearable? You can still manually log sleep, HRV, and heart rate directly in your daily check-in — it all shows up alongside your own logged trends in Healing Trends.
      </div>
    </Card>
  );
}
