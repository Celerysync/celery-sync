import { useState, useEffect, useCallback } from "react";
import C from "../lib/colors.js";
import { Card, Btn } from "./ui.jsx";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function WearableConnect({ authUser }) {
  const [status, setStatus] = useState(null);   // null = loading, [] = none connected
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const loadStatus = useCallback(async () => {
    if (!authUser?.id) return;
    try {
      const res = await fetch(`${API}/api/wearable/status/${authUser.id}`);
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
      const res = await fetch(`${API}/api/wearable/oura/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: authUser.id, token: token.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Connection failed");
      setToken("");
      setSuccess("Oura Ring connected! Syncing your data now…");
      await loadStatus();
      // Auto-sync after connecting
      await syncNow();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const disconnectOura = async () => {
    setSaving(true);
    await fetch(`${API}/api/wearable/oura/token`, {
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
      const res = await fetch(`${API}/api/wearable/oura/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: authUser.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(`Synced ${data.days} days of Oura data — your trends are updated!`);
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
    const now = new Date();
    const diffH = Math.floor((now - d) / 3600000);
    if (diffH < 1) return "Just now";
    if (diffH < 24) return `${diffH}h ago`;
    return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  };

  return (
    <Card>
      <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal, marginBottom: 4 }}>
        💓 Wearable Integration
      </div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 16, lineHeight: 1.5 }}>
        Connect your Oura Ring to automatically import sleep quality, HRV, and readiness data — interpreted through Anthony William's healing lens.
      </div>

      {/* What we read */}
      <div style={{ background: C.sageLight, borderRadius: 12, padding: "12px 14px", marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.sageDark, marginBottom: 6 }}>What CelerySync reads from Oura:</div>
        {[
          "💤 Sleep hours & quality → liver detox window analysis",
          "💓 Morning HRV → adrenal & nervous system health",
          "❤️ Resting heart rate → viral load indicator",
          "🌡 Readiness score → healing capacity for the day",
        ].map((line) => (
          <div key={line} style={{ fontSize: 12, color: C.charcoal, lineHeight: 1.5, marginBottom: 2 }}>{line}</div>
        ))}
      </div>

      {status === null ? (
        <div style={{ fontSize: 13, color: C.muted }}>Loading…</div>
      ) : ouraToken ? (
        /* Connected state */
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: C.sageLight, borderRadius: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 24 }}>⭕</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.sageDark }}>Oura Ring — Connected</div>
              <div style={{ fontSize: 11, color: C.mid }}>Last sync: {fmtSync(ouraToken.last_sync)} · Auto-syncs daily at 6:30am</div>
            </div>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.sage, flexShrink: 0 }} />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={syncNow}
              disabled={syncing}
              style={{
                flex: 1, padding: "10px", borderRadius: 10, border: `1.5px solid ${C.sage}`,
                background: "none", color: C.sageDark, fontFamily: "Georgia,serif",
                fontWeight: 700, fontSize: 13, cursor: syncing ? "default" : "pointer",
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
                fontSize: 13, cursor: saving ? "default" : "pointer",
              }}
            >
              Disconnect
            </button>
          </div>
        </div>
      ) : (
        /* Connect form */
        <div>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13, color: C.charcoal, marginBottom: 8 }}>
            Connect your Oura Ring
          </div>
          <div style={{ fontSize: 12, color: C.mid, marginBottom: 12, lineHeight: 1.6 }}>
            1. Open <strong>cloud.ouraring.com</strong> in a browser{"\n"}
            2. Go to <strong>Profile → Personal Access Tokens</strong>{"\n"}
            3. Click <strong>Create New Token</strong> → copy it here
          </div>
          <textarea
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste your Oura personal access token here…"
            rows={2}
            style={{
              width: "100%", boxSizing: "border-box", padding: "10px 12px",
              borderRadius: 10, border: `1.5px solid ${C.border}`,
              fontFamily: "monospace", fontSize: 12, color: C.charcoal,
              resize: "none", outline: "none", marginBottom: 10,
            }}
          />
          <Btn full onClick={connectOura} disabled={saving || !token.trim()} color={C.sageDark}>
            {saving ? "Connecting…" : "Connect Oura Ring →"}
          </Btn>

          <div style={{ marginTop: 12, padding: "10px 12px", background: C.mist, borderRadius: 10, fontSize: 11, color: C.mid, lineHeight: 1.5 }}>
            No Oura Ring? You can still manually log sleep hours, quality, and HRV in each day's check-in. The trends and MM interpretations work with manual data too.
          </div>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 10, padding: "10px 12px", background: C.terracottaLight, border: `1px solid ${C.terracotta}40`, borderRadius: 10, fontSize: 12, color: C.terracotta }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ marginTop: 10, padding: "10px 12px", background: C.sageLight, border: `1px solid ${C.sage}40`, borderRadius: 10, fontSize: 12, color: C.sageDark }}>
          ✓ {success}
        </div>
      )}
    </Card>
  );
}
