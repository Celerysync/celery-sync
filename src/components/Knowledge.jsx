import { useState } from "react";
import C from "../lib/colors.js";
import { Card, Btn } from "./ui.jsx";
import { useLocalStorage } from "../hooks/useLocalStorage.js";

const AW_BOOKS = [
  { title: "Medical Medium", emoji: "📗", url: "https://www.amazon.com/dp/1401944450" },
  { title: "Life-Changing Foods", emoji: "📗", url: "https://www.amazon.com/dp/1401948456" },
  { title: "Thyroid Healing", emoji: "📗", url: "https://www.amazon.com/dp/1401948499" },
  { title: "Liver Rescue", emoji: "📗", url: "https://www.amazon.com/dp/1401954030" },
  { title: "Celery Juice", emoji: "📗", url: "https://www.amazon.com/dp/1401957684" },
  { title: "Cleanse to Heal", emoji: "📗", url: "https://www.amazon.com/dp/1401958915" },
  { title: "Brain Saver", emoji: "📗", url: "https://www.amazon.com/dp/1401969011" },
  { title: "Brain Saver Protocols", emoji: "📗", url: "https://www.amazon.com/dp/1401969038" },
];

const AW_LINKS = [
  { label: "medicalmedium.com", emoji: "🌐", url: "https://www.medicalmedium.com", desc: "Official website — free protocols, recipes, and articles" },
  { label: "YouTube", emoji: "▶️", url: "https://www.youtube.com/@MedicalMedium", desc: "Thousands of hours of free teachings" },
  { label: "Podcast", emoji: "🎙", url: "https://www.medicalmedium.com/podcast", desc: "Medical Medium Podcast — free episodes" },
  { label: "Instagram", emoji: "📸", url: "https://www.instagram.com/medicalmedium", desc: "Daily tips and healing information" },
];

function isValidYouTubeUrl(url) {
  return /youtube\.com|youtu\.be/i.test(url);
}

export default function Knowledge({ authUser }) {
  const [savedVideos, setSavedVideos] = useLocalStorage("cs_savedVideoLinks", []);
  const [ytUrl, setYtUrl] = useState("");
  const [ytTitle, setYtTitle] = useState("");
  const [status, setStatus] = useState(null);

  const saveVideo = () => {
    const url = ytUrl.trim();
    if (!url) return;
    if (!isValidYouTubeUrl(url)) {
      setStatus({ ok: false, text: "Please enter an official Anthony William YouTube video URL." });
      setTimeout(() => setStatus(null), 4000);
      return;
    }
    const entry = {
      id: Date.now(),
      title: ytTitle.trim() || url,
      url,
      savedAt: new Date().toLocaleDateString("en-AU", { month: "short", day: "numeric", year: "numeric" }),
    };
    setSavedVideos((v) => [entry, ...v]);
    setYtUrl("");
    setYtTitle("");
    setStatus({ ok: true, text: "Video link saved — tap it any time to watch." });
    setTimeout(() => setStatus(null), 4000);
  };

  const removeVideo = (id) => setSavedVideos((v) => v.filter((x) => x.id !== id));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h2 style={{ margin: 0, fontFamily: "Georgia,serif", fontSize: 20, color: C.charcoal }}>
          🔗 Resources
        </h2>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
          Official Anthony William content — links to his work so you can go to the source
        </div>
      </div>

      <div style={{ padding: "10px 14px", background: C.sageLight, borderRadius: 12, border: `1px solid ${C.sage}40`, fontSize: 12, color: C.sageDark, lineHeight: 1.6 }}>
        <strong>Independent app notice:</strong> CelerySync paraphrases and attributes Anthony William's publicly shared teachings. For complete protocols, exact wording, and full healing plans, always refer to his official books and content below.
      </div>

      {/* Official links */}
      <Card>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal, marginBottom: 12 }}>
          Official Anthony William
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {AW_LINKS.map((l) => (
            <a
              key={l.label}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "11px 14px", borderRadius: 12,
                background: C.mist, border: `1px solid ${C.border}`,
                borderLeftWidth: 4, borderLeftColor: C.sage,
                textDecoration: "none",
              }}
            >
              <span style={{ fontSize: 22, flexShrink: 0 }}>{l.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13, color: C.charcoal }}>{l.label}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{l.desc}</div>
              </div>
              <span style={{
                fontSize: 9, fontWeight: 700, color: C.sage, letterSpacing: 0.4,
                textTransform: "uppercase", flexShrink: 0, whiteSpace: "nowrap",
              }}>
                Official ↗
              </span>
            </a>
          ))}
        </div>
      </Card>

      {/* Books */}
      <Card>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal, marginBottom: 4 }}>
          Anthony William's Books
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 12, lineHeight: 1.5 }}>
          For full protocols, exact supplement amounts, and complete healing plans — the books are the authoritative source.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {AW_BOOKS.map((b) => (
            <a
              key={b.title}
              href={b.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", borderRadius: 10,
                background: C.mist, border: `1px solid ${C.border}`,
                borderLeftWidth: 4, borderLeftColor: C.sage,
                textDecoration: "none",
              }}
            >
              <span style={{ fontSize: 18 }}>{b.emoji}</span>
              <span style={{ fontFamily: "Georgia,serif", fontSize: 13, color: C.charcoal, flex: 1 }}>{b.title}</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: C.sage, letterSpacing: 0.4, textTransform: "uppercase" }}>Official ↗</span>
            </a>
          ))}
        </div>
      </Card>

      {/* Save a video link */}
      <Card>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal, marginBottom: 4 }}>
          ▶️ Save an AW Video Link
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 12, lineHeight: 1.5 }}>
          Save links to official Anthony William YouTube videos for quick access. Links only — no content is downloaded or stored.
        </div>

        {status && (
          <div style={{
            padding: "9px 12px", borderRadius: 10, fontSize: 12, marginBottom: 10,
            background: status.ok ? C.sageLight : "#fef2f2",
            border: `1px solid ${status.ok ? C.sage : "#fca5a5"}40`,
            color: status.ok ? C.sageDark : "#dc2626",
          }}>
            {status.text}
          </div>
        )}

        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: C.mid, marginBottom: 5, fontFamily: "Georgia,serif" }}>Label (optional)</div>
          <input
            value={ytTitle}
            onChange={(e) => setYtTitle(e.target.value)}
            placeholder="e.g. AW on EBV and Thyroid"
            style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontFamily: "Georgia,serif", fontSize: 13, outline: "none", background: C.mist, boxSizing: "border-box" }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: C.mid, marginBottom: 5, fontFamily: "Georgia,serif" }}>YouTube URL</div>
          <input
            value={ytUrl}
            onChange={(e) => setYtUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveVideo()}
            placeholder="https://www.youtube.com/watch?v=..."
            style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontFamily: "Georgia,serif", fontSize: 13, outline: "none", background: C.mist, boxSizing: "border-box" }}
          />
        </div>
        <Btn full onClick={saveVideo} disabled={!ytUrl.trim()} color={C.sageDark}>
          Save Video Link
        </Btn>

        {savedVideos.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13, color: C.charcoal, marginBottom: 8 }}>
              Saved videos ({savedVideos.length})
            </div>
            {savedVideos.map((v) => (
              <div key={v.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", borderRadius: 10,
                background: C.mist, border: `1px solid ${C.border}`,
                marginBottom: 6,
              }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>▶️</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <a href={v.url} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "Georgia,serif", fontSize: 12, color: C.sageDark, textDecoration: "none", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {v.title}
                  </a>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>{v.savedAt}</div>
                </div>
                <button onClick={() => removeVideo(v.id)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "3px 8px", fontSize: 11, color: C.muted, cursor: "pointer", flexShrink: 0 }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Disclaimer */}
      <div style={{ padding: "10px 14px", background: "#f9f9f7", borderRadius: 12, border: `1px solid ${C.border}`, fontSize: 11, color: C.muted, lineHeight: 1.7, textAlign: "center" }}>
        CelerySync is an <strong>independent</strong> app — not affiliated with, endorsed by, or connected to Anthony William or Medical Medium LLC. "Medical Medium" is a registered trademark of Anthony William, Inc.
      </div>
    </div>
  );
}
