import { useState, useEffect } from "react";
import C from "../lib/colors.js";
import { Card, Btn } from "./ui.jsx";
import { usePractitioner } from "../hooks/usePractitioner.js";
import { callClaude } from "../lib/api.js";
import { CONDITIONS } from "../data/conditions.js";

const AVATARS = ["🌿","🌸","🌺","💫","🌙","☀️","🦋","🌻","🍃","💚","🌈","⭐","🫐","🍋","🫁","🧠"];
const ALL_CONDITIONS = Object.keys(CONDITIONS);

function timeAgo(ts) {
  if (!ts) return "never";
  const d = new Date(ts);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 86400) return "today";
  if (diff < 172800) return "yesterday";
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Client Form Modal ─────────────────────────────────────────────────────────
function ClientModal({ client, onSave, onClose }) {
  const [name, setName] = useState(client?.name || "");
  const [age, setAge] = useState(client?.age || "");
  const [avatar, setAvatar] = useState(client?.avatar_emoji || "🌿");
  const [conditions, setConditions] = useState(client?.conditions || []);
  const [goal, setGoal] = useState(client?.goal || "");
  const [notes, setNotes] = useState(client?.notes || "");
  const [condSearch, setCondSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = ALL_CONDITIONS.filter(c =>
    c.toLowerCase().includes(condSearch.toLowerCase()) && !conditions.includes(c)
  ).slice(0, 8);

  const toggleCond = (c) => setConditions(prev =>
    prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
  );

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onSave({ name: name.trim(), age: age ? parseInt(age) : null, avatar_emoji: avatar, conditions, goal, notes });
    setSaving(false);
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000066", zIndex: 50, display: "flex", alignItems: "flex-end" }}>
      <div style={{ background: C.white, borderRadius: "24px 24px 0 0", padding: 24, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 18, color: C.charcoal, marginBottom: 16 }}>
          {client ? "Edit Client" : "Add New Client"}
        </div>

        {/* Avatar */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 14 }}>
          {AVATARS.map(a => (
            <button key={a} onClick={() => setAvatar(a)} style={{
              fontSize: 24, width: 42, height: 42, borderRadius: 10, border: "none",
              background: avatar === a ? C.sageLight : C.mist, cursor: "pointer",
              boxShadow: avatar === a ? `0 0 0 2px ${C.sage}` : "none",
            }}>{a}</button>
          ))}
        </div>

        <input value={name} onChange={e => setName(e.target.value)} placeholder="Client name *"
          style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontFamily: "Georgia,serif", fontSize: 14, marginBottom: 10, outline: "none" }} />
        <input value={age} onChange={e => setAge(e.target.value)} placeholder="Age (optional)" type="number"
          style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontFamily: "Georgia,serif", fontSize: 14, marginBottom: 10, outline: "none" }} />
        <input value={goal} onChange={e => setGoal(e.target.value)} placeholder="Healing goal (e.g. reduce fatigue, heal thyroid)"
          style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontFamily: "Georgia,serif", fontSize: 14, marginBottom: 10, outline: "none" }} />

        {/* Conditions */}
        <div style={{ fontSize: 12, fontWeight: 700, color: C.mid, marginBottom: 6 }}>Conditions</div>
        {conditions.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {conditions.map(c => (
              <div key={c} onClick={() => toggleCond(c)} style={{
                padding: "4px 10px", borderRadius: 20, fontSize: 12, cursor: "pointer",
                background: C.plumLight, color: C.plum, border: `1px solid ${C.plum}30`, fontFamily: "Georgia,serif",
              }}>
                {c} ✕
              </div>
            ))}
          </div>
        )}
        <input value={condSearch} onChange={e => setCondSearch(e.target.value)} placeholder="Search conditions to add…"
          style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontFamily: "Georgia,serif", fontSize: 13, marginBottom: 6, outline: "none" }} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {filtered.map(c => (
            <div key={c} onClick={() => toggleCond(c)} style={{
              padding: "4px 10px", borderRadius: 20, fontSize: 12, cursor: "pointer",
              background: C.mist, color: C.charcoal, fontFamily: "Georgia,serif",
            }}>{c}</div>
          ))}
        </div>

        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Initial notes, history, relevant context…" rows={3}
          style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontFamily: "Georgia,serif", fontSize: 13, resize: "none", marginBottom: 14, outline: "none" }} />

        <Btn full onClick={handleSave} disabled={saving || !name.trim()} color={C.sageDark}>
          {saving ? "Saving…" : client ? "Save Changes" : "Add Client"}
        </Btn>
        <button onClick={onClose} style={{ width: "100%", marginTop: 10, background: "none", border: "none", color: C.muted, fontSize: 13, cursor: "pointer", padding: "8px 0" }}>Cancel</button>
      </div>
    </div>
  );
}

// ── Session Modal ─────────────────────────────────────────────────────────────
function SessionModal({ client, session, onSave, onClose }) {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(session?.session_date || today);
  const [energy, setEnergy] = useState(session?.energy || null);
  const [celery, setCelery] = useState(session?.celery_oz ?? null);
  const [morning, setMorning] = useState(session?.morning_protocol || false);
  const [symptoms, setSymptoms] = useState(session?.symptoms || []);
  const [clientNotes, setClientNotes] = useState(session?.client_notes || "");
  const [practNotes, setPractNotes] = useState(session?.practitioner_notes || "");
  const [protoChanges, setProtoChanges] = useState(session?.protocol_changes || "");
  const [saving, setSaving] = useState(false);

  const toggleSym = s => setSymptoms(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  const handleSave = async () => {
    setSaving(true);
    await onSave({ session_date: date, energy, celery_oz: celery, morning_protocol: morning, symptoms, client_notes: clientNotes, practitioner_notes: practNotes, protocol_changes: protoChanges });
    setSaving(false);
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000066", zIndex: 50, display: "flex", alignItems: "flex-end" }}>
      <div style={{ background: C.white, borderRadius: "24px 24px 0 0", padding: 24, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 17, color: C.charcoal, marginBottom: 4 }}>
          Session — {client.name}
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Record this appointment or check-in</div>

        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontFamily: "Georgia,serif", fontSize: 13, marginBottom: 14, outline: "none" }} />

        <div style={{ fontSize: 12, fontWeight: 700, color: C.mid, marginBottom: 8 }}>Client's energy today (1–10)</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {[2,4,6,8,10].map(v => (
            <button key={v} onClick={() => setEnergy(energy === v ? null : v)} style={{
              flex: 1, padding: "8px 4px", borderRadius: 10, border: "none", cursor: "pointer",
              background: energy === v ? C.leaf : C.mist, color: energy === v ? C.white : C.charcoal,
              fontSize: 12, fontFamily: "Georgia,serif", fontWeight: 700,
            }}>{v}</button>
          ))}
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: C.mid, marginBottom: 8 }}>Celery juice oz</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {[0,8,16,32].map(v => (
            <button key={v} onClick={() => setCelery(celery === v ? null : v)} style={{
              flex: 1, padding: "8px 4px", borderRadius: 10, border: "none", cursor: "pointer",
              background: celery === v ? C.sage : C.mist, color: celery === v ? C.white : C.charcoal,
              fontSize: 12, fontFamily: "Georgia,serif", fontWeight: 700,
            }}>{v === 0 ? "None" : `${v}oz`}</button>
          ))}
        </div>

        <div onClick={() => setMorning(v => !v)} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, cursor: "pointer" }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, background: morning ? C.sage : "transparent", border: `2px solid ${morning ? C.sage : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontSize: 13, fontWeight: 700 }}>
            {morning ? "✓" : ""}
          </div>
          <div style={{ fontSize: 13, color: C.charcoal }}>Morning protocol completed</div>
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: C.mid, marginBottom: 8 }}>Symptoms reported</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {(client.conditions?.length > 0 ? client.conditions : ["Fatigue","Brain fog","Anxiety","Bloating","Insomnia"]).map(s => (
            <div key={s} onClick={() => toggleSym(s)} style={{
              padding: "5px 10px", borderRadius: 20, fontSize: 11, cursor: "pointer",
              background: symptoms.includes(s) ? C.terracotta : C.mist,
              color: symptoms.includes(s) ? C.white : C.charcoal, fontFamily: "Georgia,serif",
            }}>{s}</div>
          ))}
        </div>

        <textarea value={clientNotes} onChange={e => setClientNotes(e.target.value)} placeholder="What the client reported…" rows={2}
          style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontFamily: "Georgia,serif", fontSize: 13, resize: "none", marginBottom: 10, outline: "none" }} />
        <textarea value={practNotes} onChange={e => setPractNotes(e.target.value)} placeholder="Your practitioner notes…" rows={2}
          style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontFamily: "Georgia,serif", fontSize: 13, resize: "none", marginBottom: 10, outline: "none" }} />
        <textarea value={protoChanges} onChange={e => setProtoChanges(e.target.value)} placeholder="Protocol changes or additions this session…" rows={2}
          style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontFamily: "Georgia,serif", fontSize: 13, resize: "none", marginBottom: 14, outline: "none" }} />

        <Btn full onClick={handleSave} disabled={saving} color={C.sageDark}>
          {saving ? "Saving…" : "Save Session"}
        </Btn>
        <button onClick={onClose} style={{ width: "100%", marginTop: 10, background: "none", border: "none", color: C.muted, fontSize: 13, cursor: "pointer", padding: "8px 0" }}>Cancel</button>
      </div>
    </div>
  );
}

// ── Client Detail View ────────────────────────────────────────────────────────
function ClientView({ client, authUser, prac, onBack, onEdit }) {
  const { sessions, protocol, loadSessions, saveSession, loadProtocol, saveProtocol } = prac;
  const [tab, setTab] = useState("protocol");
  const [showSession, setShowSession] = useState(false);
  const [editSession, setEditSession] = useState(null);
  const [genLoading, setGenLoading] = useState(false);

  useEffect(() => {
    loadSessions(client.id);
    loadProtocol(client.id);
  }, [client.id]);

  const generateProtocol = async () => {
    setGenLoading(true);
    const dbContext = client.conditions.map(cond => {
      const c = CONDITIONS[cond];
      if (!c) return `${cond}: No exact data — use general MM teachings`;
      return `${cond}: Cause: ${c.cause} | Supplements: ${c.supps.join(", ")} | Avoid: ${c.avoid.join(", ")} | Book: ${c.book || "Medical Medium series"}`;
    }).join("\n");

    const text = await callClaude({
      tier: 'deep',
      maxTokens: 1200,
      messages: [{
        role: "user",
        content: `You are a Medical Medium practitioner assistant. Generate a complete healing protocol document for this client:

CLIENT: ${client.name}${client.age ? `, age ${client.age}` : ""}
GOAL: ${client.goal || "General healing"}
CONDITIONS: ${client.conditions.join(", ") || "General wellness"}
PRACTITIONER NOTES: ${client.notes || "None"}

CONDITION INFORMATION (paraphrased from Anthony William's publicly shared teachings):
${dbContext || "Draw from Anthony William's publicly shared Medical Medium teachings."}

Generate a professional, structured protocol document with:
1. 🌅 MORNING PROTOCOL (lemon water, celery juice, HMDS sequence and timing — paraphrased and attributed to Anthony William; direct the client to his books for specific amounts)
2. 💊 SUPPLEMENT PROTOCOL (supplements Anthony William associates with their conditions — paraphrased and attributed to him; NEVER state exact dosages; always direct the client to the relevant book for amounts)
3. 🍎 DAILY FOOD PROTOCOL (what to eat, when, and in what combination)
4. 🚫 AVOID LIST (specific to their conditions)
5. 🌿 CLEANSE RECOMMENDATION (which AW cleanse to start and why)
6. 📚 BOOKS TO READ (specific titles relevant to their conditions — these are the authoritative source for full protocols and dosage specifics)
7. 🎯 90-DAY MILESTONES (what to expect and when — supportive and realistic)
8. 💛 ENCOURAGEMENT (a warm closing message for the client)

Frame everything as Anthony William's publicly shared teachings, paraphrased and attributed. Never reproduce his copyrighted text. Never state yourself as the dosing authority — always point to his books for specifics.
End with: ⚠️ This document is based on Anthony William's publicly shared Medical Medium teachings, paraphrased and attributed. It is not medical advice. Please consult your healthcare provider before starting any new supplement regime.`,
      }],
    }).catch(err => `Error generating protocol: ${err.message}`);

    await saveProtocol(client.id, text);
    setGenLoading(false);
  };

  const printProtocol = () => {
    if (!protocol?.content) return;
    const win = window.open("", "_blank");
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Protocol — ${client.name}</title>
<style>body{font-family:Georgia,serif;max-width:760px;margin:0 auto;padding:36px;color:#1a1a1a}
h1{color:#3d5e42;border-bottom:2px solid #6b9e72;padding-bottom:12px}
pre{white-space:pre-wrap;font-family:Georgia,serif;font-size:13.5px;line-height:1.85}
footer{margin-top:36px;padding-top:14px;border-top:1px solid #dde8dd;font-size:11px;color:#9ca3af}</style>
</head><body>
<h1>🌿 Healing Protocol — ${client.name}</h1>
<p style="font-size:12px;color:#6b7280">Generated ${new Date().toLocaleDateString("en-AU",{day:"numeric",month:"long",year:"numeric"})} · CelerySync Practitioner Portal</p>
<pre>${protocol.content}</pre>
<footer>Based on Anthony William's Medical Medium teachings. Always consult your healthcare provider.</footer>
</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 400);
  };

  const TABS = [
    { id: "protocol", label: "Protocol" },
    { id: "sessions", label: `Sessions (${sessions.length})` },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: C.sage, fontSize: 13, cursor: "pointer", textAlign: "left", padding: 0, fontFamily: "Georgia,serif" }}>
        ← My Clients
      </button>

      {/* Client header */}
      <div style={{ background: `linear-gradient(135deg,${C.sageDark},${C.leaf})`, borderRadius: 18, padding: "18px 18px 14px", color: C.white }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 40 }}>{client.avatar_emoji}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 20 }}>{client.name}</div>
            {client.age && <div style={{ fontSize: 12, opacity: 0.85 }}>Age {client.age}</div>}
            {client.goal && <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>{client.goal}</div>}
          </div>
          <button onClick={onEdit} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 20, padding: "6px 14px", color: C.white, fontSize: 12, cursor: "pointer", fontFamily: "Georgia,serif" }}>
            Edit
          </button>
        </div>
        {client.conditions?.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {client.conditions.map(c => (
              <div key={c} style={{ background: "rgba(255,255,255,0.2)", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontFamily: "Georgia,serif" }}>{c}</div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "9px 12px", borderRadius: 20, border: "none", cursor: "pointer",
            background: tab === t.id ? C.sageDark : C.mist,
            color: tab === t.id ? C.white : C.mid,
            fontFamily: "Georgia,serif", fontSize: 13, fontWeight: tab === t.id ? 700 : 400,
          }}>{t.label}</button>
        ))}
      </div>

      {/* Protocol tab */}
      {tab === "protocol" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn full onClick={generateProtocol} disabled={genLoading} color={C.sageDark}>
              {genLoading ? "🌿 Generating…" : protocol ? "🔄 Regenerate Protocol" : "✨ Generate AI Protocol"}
            </Btn>
            {protocol && (
              <button onClick={printProtocol} style={{ background: C.mist, border: "none", borderRadius: 30, padding: "11px 16px", cursor: "pointer", fontSize: 13, color: C.charcoal, fontFamily: "Georgia,serif", flexShrink: 0 }}>
                🖨 Print
              </button>
            )}
          </div>

          {protocol ? (
            <Card>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>
                Generated {new Date(protocol.generated_at).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}
              </div>
              <div style={{ fontSize: 13.5, color: C.charcoal, lineHeight: 1.85, whiteSpace: "pre-wrap" }}>
                {protocol.content}
              </div>
            </Card>
          ) : (
            <Card style={{ textAlign: "center", padding: 32 }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
              <div style={{ fontFamily: "Georgia,serif", fontSize: 15, color: C.charcoal, marginBottom: 6 }}>No protocol yet</div>
              <div style={{ fontSize: 13, color: C.muted }}>Generate an AI protocol based on {client.name}'s conditions and goal.</div>
            </Card>
          )}
        </div>
      )}

      {/* Sessions tab */}
      {tab === "sessions" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Btn full onClick={() => { setEditSession(null); setShowSession(true); }} color={C.sage}>
            + Add Session / Appointment
          </Btn>
          {sessions.length === 0 ? (
            <Card style={{ textAlign: "center", padding: 24 }}>
              <div style={{ fontSize: 13, color: C.muted }}>No sessions recorded yet. Add your first session above.</div>
            </Card>
          ) : sessions.map(s => (
            <Card key={s.id} onClick={() => { setEditSession(s); setShowSession(true); }} style={{ cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal }}>
                  {new Date(s.session_date + "T12:00:00").toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {s.energy && <div style={{ fontSize: 11, background: C.sageLight, color: C.sageDark, borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>⚡ {s.energy}/10</div>}
                  {s.celery_oz > 0 && <div style={{ fontSize: 11, background: "#f0fdf4", color: C.leaf, borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>🥬 {s.celery_oz}oz</div>}
                </div>
              </div>
              {s.client_notes && <div style={{ fontSize: 12, color: C.mid, marginBottom: 4, lineHeight: 1.5 }}>Client: {s.client_notes.slice(0, 120)}{s.client_notes.length > 120 ? "…" : ""}</div>}
              {s.practitioner_notes && <div style={{ fontSize: 12, color: C.sageDark, lineHeight: 1.5 }}>Notes: {s.practitioner_notes.slice(0, 120)}{s.practitioner_notes.length > 120 ? "…" : ""}</div>}
              {s.symptoms?.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                  {s.symptoms.slice(0, 4).map(sym => <div key={sym} style={{ fontSize: 10, background: C.terracottaLight, color: C.terracotta, borderRadius: 20, padding: "2px 8px" }}>{sym}</div>)}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {showSession && (
        <SessionModal
          client={client}
          session={editSession}
          onSave={(data) => saveSession(client.id, data)}
          onClose={() => { setShowSession(false); setEditSession(null); }}
        />
      )}
    </div>
  );
}

// ── Main Portal ───────────────────────────────────────────────────────────────
export default function PractitionerPortal({ authUser }) {
  const prac = usePractitioner(authUser);
  const { clients, loading, loadClients, createClient, updateClient, deleteClient } = prac;
  const [activeClient, setActiveClient] = useState(null);
  const [showAddClient, setShowAddClient] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  useEffect(() => { loadClients(); }, [authUser?.id]);

  if (activeClient) {
    const current = clients.find(c => c.id === activeClient) || null;
    if (!current) { setActiveClient(null); return null; }
    return (
      <ClientView
        client={current}
        authUser={authUser}
        prac={prac}
        onBack={() => setActiveClient(null)}
        onEdit={() => setEditingClient(current)}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <h2 style={{ margin: 0, fontFamily: "Georgia,serif", fontSize: 22, color: C.charcoal }}>🏥 My Practice</h2>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Manage your Medical Medium clients</div>
      </div>

      <Card style={{ background: `linear-gradient(135deg,${C.sageDark},${C.leaf})`, border: "none" }}>
        <div style={{ color: C.white }}>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Practitioner Plan ✨</div>
          <div style={{ fontSize: 12, opacity: 0.9, lineHeight: 1.6 }}>
            {clients.length} client{clients.length !== 1 ? "s" : ""} · Generate AI protocols · Session notes · Printable reports
          </div>
        </div>
      </Card>

      <Btn full onClick={() => setShowAddClient(true)} color={C.sageDark}>
        + Add New Client
      </Btn>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: C.muted, fontFamily: "Georgia,serif" }}>🌿 Loading clients…</div>
      ) : clients.length === 0 ? (
        <Card style={{ textAlign: "center", padding: 36 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🌿</div>
          <div style={{ fontFamily: "Georgia,serif", fontSize: 16, color: C.charcoal, marginBottom: 8 }}>Add your first client</div>
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
            Add a client and generate their personalised Medical Medium protocol in seconds.
          </div>
        </Card>
      ) : (
        clients.map(client => (
          <Card key={client.id} onClick={() => setActiveClient(client.id)} style={{ cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 34, flexShrink: 0 }}>{client.avatar_emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal }}>{client.name}</div>
                {client.age && <div style={{ fontSize: 11, color: C.muted }}>{client.age} years old</div>}
                {client.conditions?.length > 0 && (
                  <div style={{ fontSize: 12, color: C.mid, marginTop: 3 }}>{client.conditions.slice(0, 3).join(", ")}{client.conditions.length > 3 ? ` +${client.conditions.length - 3}` : ""}</div>
                )}
                {client.goal && <div style={{ fontSize: 11, color: C.muted, marginTop: 2, fontStyle: "italic" }}>{client.goal}</div>}
              </div>
              <div style={{ color: C.sage, fontSize: 20, flexShrink: 0 }}>›</div>
            </div>
          </Card>
        ))
      )}

      {showAddClient && (
        <ClientModal
          onSave={createClient}
          onClose={() => setShowAddClient(false)}
        />
      )}

      {editingClient && (
        <ClientModal
          client={editingClient}
          onSave={(data) => updateClient(editingClient.id, data)}
          onClose={() => setEditingClient(null)}
        />
      )}
    </div>
  );
}
