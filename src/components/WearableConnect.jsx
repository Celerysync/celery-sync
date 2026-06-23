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
    name: "Apple Watch",
    emoji: "⌚",
    desc: "Log your Apple Health data manually after checking the Health app",
    type: "manual",
    color: "#1C1C1E",
    metrics: ["Sleep hours (Health → Sleep)", "HRV (Health → Heart Rate → HRV)", "Resting HR (Health → Heart Rate)", "Steps (Health → Activity)"],
    howTo: "Open the Health app on your iPhone → Browse → Sleep / Heart / Activity → enter the numbers below",
  },
  {
    id: "garmin",
    name: "Garmin",
    emoji: "🟠",
    desc: "Log your Garmin Connect data manually after checking the app",
    type: "manual",
    color: "#007CC3",
    metrics: ["Sleep (Garmin Connect → Sleep)", "HRV (Health Stats → HRV)", "Resting HR (Health Stats)", "Body Battery (maps to readiness)"],
    howTo: "Open Garmin Connect → Today → check Sleep, Health Stats, and Body Battery → enter below",
  },
  {
    id: "whoop",
    name: "Whoop",
    emoji: "⚡",
    desc: "Log your Whoop data manually — Recovery, sleep, and HRV",
    type: "manual",
    color: "#00A6FF",
    metrics: ["Recovery % (maps to readiness)", "Sleep hours", "HRV", "Resting HR"],
    howTo: "Open Whoop app → Today → check your Recovery, Sleep, and Health Monitor stats → enter below",
  },
  {
    id: "fitbit",
    name: "Fitbit / Google Fit",
    emoji: "💙",
    desc: "Log your Fitbit or Google Fit data manually",
    type: "manual",
    color: "#00B0B9",
    metrics: ["Sleep hours & score", "Resting HR", "Steps", "Active Zone Minutes (maps to readiness)"],
    howTo: "Open Fitbit app → Today tab → check Sleep, Heart Rate, and Activity → enter below",
  },
  {
    id: "samsung",
    name: "Samsung Galaxy Watch",
    emoji: "📿",
    desc: "Log your Samsung Health data manually",
    type: "manual",
    color: "#1428A0",
    metrics: ["Sleep hours & score", "Resting HR", "Stress score (maps to HRV)", "Steps"],
    howTo: "Open Samsung Health app → Today → check Sleep, Heart Rate, and Activity → enter below",
  },
];

function ManualEntryForm({ wearable, authUser, onSaved }) {
  const [form, setForm] = useState({ sleep_hours: "", sleep_quality: "", hrv: "", resting_hr: "", steps: "", readiness_score: "" });
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
    if (form.steps) payload.steps = form.steps;
    if (form.readiness_score) payload.readiness_score = form.readiness_score;
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
    { key: "steps", label: "Steps today", placeholder: "e.g. 8500", type: "number" },
    { key: "readiness_score", label: "Readiness / Recovery %", placeholder: "0–100", type: "number" },
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
        Connect your wearable to track sleep, HRV, and readiness — all interpreted through Anthony William's healing lens. Oura Ring syncs automatically; all others use quick manual entry.
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
          const oura = w.id === "oura";

          return (
            <div key={w.id} style={{
              border: `1.5px solid ${isOuraConnected ? C.sage : C.border}`,
              borderRadius: 14, overflow: "hidden",
            }}>
              {/* Header row */}
              <button
                onClick={() => setExpanded(isExpanded ? null : w.id)}
                style={{
                  width: "100%", padding: "12px 14px", background: isOuraConnected ? C.sageLight : C.white,
                  border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                  touchAction: "manipulation", textAlign: "left",
                }}
              >
                <div style={{ fontSize: 22, flexShrink: 0 }}>{w.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal }}>{w.name}</div>
                    {isOuraConnected && (
                      <div style={{ fontSize: 10, background: C.sage, color: "#fff", borderRadius: 10, padding: "1px 7px", fontWeight: 700 }}>
                        Connected
                      </div>
                    )}
                    {w.type === "auto" && !isOuraConnected && (
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
        No wearable? You can still manually log sleep, HRV, and heart rate directly in your daily check-in. All data is interpreted through Anthony William's healing lens in your Healing Trends.
      </div>
    </Card>
  );
}
