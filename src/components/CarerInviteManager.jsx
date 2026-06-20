import { useState, useEffect, useCallback } from "react";
import C from "../lib/colors.js";
import { Card } from "./ui.jsx";

function StatusBadge({ status }) {
  const map = {
    pending: { label: "Pending", bg: C.goldLight, color: C.gold },
    active:  { label: "Active",  bg: C.sageLight, color: C.sageDark },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{
      padding: "3px 10px", borderRadius: 20, fontSize: 10,
      fontWeight: 700, background: s.bg, color: s.color,
    }}>
      {s.label}
    </span>
  );
}

export default function CarerInviteManager({ authUser, profileId }) {
  const [carers, setCarers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [inviteLink, setInviteLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState(null);

  const loadCarers = useCallback(async () => {
    if (!authUser?.id || !profileId) return;
    const res = await fetch(`/api/carers/for-profile/${profileId}?userId=${authUser.id}`);
    const data = await res.json();
    setCarers(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [authUser?.id, profileId]);

  useEffect(() => { loadCarers(); }, [loadCarers]);

  const handleInvite = async () => {
    if (!email.trim()) return;
    setSending(true);
    setInviteLink(null);
    try {
      const res = await fetch("/api/carers/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: authUser.id, profileId, carerEmail: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Something went wrong"); return; }
      setInviteLink(data.inviteLink);
      setEmail("");
      await loadCarers();
    } finally {
      setSending(false);
    }
  };

  const handleRevoke = async (id) => {
    setRevoking(id);
    await fetch(`/api/carers/${id}?userId=${authUser.id}`, { method: "DELETE" });
    await loadCarers();
    setRevoking(null);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Card>
      <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal, marginBottom: 4 }}>
        💜 Carers
      </div>
      <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginBottom: 16 }}>
        Invite a friend or family member to see your healing progress. They'll get a read-only view of your energy, check-ins, and milestones — so they can support you better.
      </div>

      {/* Existing carers */}
      {!loading && carers.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {carers.map(c => (
            <div key={c.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 0", borderBottom: `1px solid ${C.border}`,
            }}>
              <div>
                <div style={{ fontSize: 13, color: C.charcoal, fontWeight: 600 }}>{c.carer_email}</div>
                <div style={{ marginTop: 4 }}>
                  <StatusBadge status={c.status} />
                  {c.status === "pending" && (
                    <span style={{ fontSize: 10, color: C.muted, marginLeft: 8 }}>
                      Invite not yet accepted
                    </span>
                  )}
                  {c.status === "active" && c.accepted_at && (
                    <span style={{ fontSize: 10, color: C.muted, marginLeft: 8 }}>
                      Joined {new Date(c.accepted_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleRevoke(c.id)}
                disabled={revoking === c.id}
                style={{
                  padding: "5px 12px", borderRadius: 20, fontSize: 11,
                  border: `1px solid ${C.terracotta}40`,
                  background: "transparent", color: C.terracotta,
                  cursor: revoking === c.id ? "default" : "pointer",
                  fontFamily: "Georgia,serif",
                }}
              >
                {revoking === c.id ? "…" : "Remove"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Invite form */}
      <div style={{ marginBottom: inviteLink ? 14 : 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.charcoal, fontFamily: "Georgia,serif", marginBottom: 8 }}>
          Invite someone
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleInvite()}
            placeholder="Their email address"
            style={{
              flex: 1, padding: "10px 14px", borderRadius: 20,
              border: `1.5px solid ${C.border}`, fontSize: 13,
              fontFamily: "Georgia,serif", outline: "none",
              background: "#fff", color: C.charcoal,
            }}
          />
          <button
            onClick={handleInvite}
            disabled={sending || !email.trim()}
            style={{
              padding: "10px 18px", borderRadius: 20, border: "none",
              background: sending || !email.trim() ? C.muted : C.plum,
              color: "#fff", fontFamily: "Georgia,serif", fontWeight: 700,
              fontSize: 13, cursor: sending || !email.trim() ? "default" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {sending ? "…" : "Send invite"}
          </button>
        </div>
      </div>

      {/* Invite link */}
      {inviteLink && (
        <div style={{
          background: C.plumLight, borderRadius: 14,
          padding: "14px 16px", border: `1px solid ${C.plum}30`,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.plum, fontFamily: "Georgia,serif", marginBottom: 6 }}>
            💜 Invite link ready
          </div>
          <div style={{ fontSize: 11, color: C.mid, marginBottom: 10, lineHeight: 1.6 }}>
            Copy this link and send it via WhatsApp, text, or email. They'll need to sign in to CelerySync (free) to accept.
          </div>
          <div style={{
            background: "#fff", borderRadius: 10, padding: "9px 12px",
            fontSize: 11, color: C.charcoal, wordBreak: "break-all",
            border: `1px solid ${C.border}`, marginBottom: 10,
            fontFamily: "monospace",
          }}>
            {inviteLink}
          </div>
          <button
            onClick={copyLink}
            style={{
              width: "100%", padding: "10px", borderRadius: 20, border: "none",
              background: copied ? C.sage : C.plum, color: "#fff",
              fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13,
              cursor: "pointer", transition: "background 0.3s",
            }}
          >
            {copied ? "✓ Copied!" : "Copy link"}
          </button>
        </div>
      )}
    </Card>
  );
}
