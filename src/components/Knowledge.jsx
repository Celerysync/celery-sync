import { useState, useRef, useEffect } from "react";
import C from "../lib/colors.js";
import { Card, Btn } from "./ui.jsx";
import { useBooks } from "../hooks/useBooks.js";
import { callClaude } from "../lib/api.js";

const MM_BOOKS = [
  "Cleanse to Heal", "Brain Saver", "Brain Saver Protocols",
  "Liver Rescue", "Thyroid Healing", "Life-Changing Foods",
  "Celery Juice", "Medical Medium",
];

const SOURCE_ICON = { pdf: "📄", youtube: "▶️", note: "📝" };
const SOURCE_LABEL = { pdf: "Book PDF", youtube: "YouTube", note: "Text note" };

function BookCard({ book, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 14px", borderRadius: 14,
      background: C.mist, border: `1px solid ${C.border}`,
      marginBottom: 8,
    }}>
      <div style={{ fontSize: 22, flexShrink: 0 }}>{SOURCE_ICON[book.source_type]}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13, color: C.charcoal, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {book.title}
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
          {SOURCE_LABEL[book.source_type]}
          {book.page_count > 0 && ` · ${book.page_count} pages`}
          {` · ${book.chunk_count} passages indexed`}
        </div>
        {book.source_url && (
          <a href={book.source_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: C.sage }}>
            Watch video →
          </a>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>
        {confirmDelete ? (
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => onDelete(book.id)} style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, padding: "4px 8px", fontSize: 11, cursor: "pointer" }}>
              Remove
            </button>
            <button onClick={() => setConfirmDelete(false)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "4px 8px", fontSize: 11, cursor: "pointer", color: C.muted }}>
              Keep
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "4px 8px", fontSize: 11, color: C.muted, cursor: "pointer" }}>
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

export default function Knowledge({ authUser, bookNotes, setBookNotes, videoNotes, setVideoNotes }) {
  const { books, loading: booksLoading, loadBooks, uploadPdf, addYoutube, addNote, deleteBook } = useBooks(authUser);
  const [tab, setTab] = useState("library");
  const [status, setStatus] = useState(null); // { ok, text }
  const [working, setWorking] = useState(false);

  // PDF upload state
  const [pdfTitle, setPdfTitle] = useState("");
  const [pdfOwned, setPdfOwned] = useState(false);
  const fileRef = useRef(null);

  // YouTube state
  const [ytUrl, setYtUrl] = useState("");
  const [ytTitle, setYtTitle] = useState("");

  // Note state
  const [noteTitle, setNoteTitle] = useState("");
  const [noteText, setNoteText] = useState("");

  // Legacy quick note state
  const [bookInput, setBookInput] = useState("");
  const [bookSource, setBookSource] = useState("Cleanse to Heal");

  useEffect(() => { loadBooks(); }, [authUser?.id]);

  const showStatus = (ok, text) => {
    setStatus({ ok, text });
    setTimeout(() => setStatus(null), 6000);
  };

  const handlePdfSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!pdfOwned) return showStatus(false, "Please confirm you own a purchased copy of this book.");
    setWorking(true);
    try {
      await uploadPdf(file, pdfTitle || file.name.replace(".pdf", ""), (msg) => setStatus({ ok: true, text: `📄 ${msg}` }));
      showStatus(true, `✅ "${pdfTitle || file.name}" processed and indexed — your AI now knows this book!`);
      setPdfTitle("");
      setPdfOwned(false);
    } catch (err) {
      showStatus(false, err.message);
    }
    setWorking(false);
    e.target.value = "";
  };

  const handleYoutube = async () => {
    if (!ytUrl.trim()) return;
    setWorking(true);
    try {
      await addYoutube(ytUrl.trim(), ytTitle.trim() || undefined, (msg) => setStatus({ ok: true, text: `▶️ ${msg}` }));
      showStatus(true, `✅ Video transcript indexed — your AI now knows what Anthony William teaches in this video!`);
      setYtUrl(""); setYtTitle("");
    } catch (err) {
      showStatus(false, err.message);
    }
    setWorking(false);
  };

  const handleNote = async () => {
    if (!noteTitle.trim() || !noteText.trim()) return;
    setWorking(true);
    try {
      await addNote(noteTitle.trim(), noteText.trim());
      showStatus(true, "✅ Note indexed — your AI can now reference this content.");
      setNoteTitle(""); setNoteText("");
    } catch (err) {
      showStatus(false, err.message);
    }
    setWorking(false);
  };

  const handleQuickNote = async () => {
    if (!bookInput.trim()) return;
    setWorking(true);
    const note = {
      id: Date.now(),
      source: bookSource,
      content: bookInput.trim(),
      date: new Date().toLocaleDateString("en-AU", { month: "short", day: "numeric" }),
    };
    setBookNotes((n) => [note, ...n]);
    try {
      const insight = await callClaude({
        tier: 'quick',
        maxTokens: 280,
        messages: [{
          role: "user",
          content: `A Medical Medium follower highlighted this from "${bookSource}" by Anthony William:\n\n"${bookInput.trim()}"\n\nIn 2 sentences: expand on this teaching and give ONE specific action to take today. Attribute to Anthony William.`,
        }],
      });
      showStatus(true, "AI insight: " + insight);
    } catch {
      showStatus(true, "✅ Note saved to your knowledge base.");
    }
    setBookInput("");
    setWorking(false);
  };

  const TABS = [
    { id: "library", label: "📚 My Library" },
    { id: "upload", label: "📄 Add Book" },
    { id: "youtube", label: "▶️ Add Video" },
    { id: "note", label: "📝 Add Note" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <h2 style={{ margin: 0, fontFamily: "Georgia,serif", fontSize: 20, color: C.charcoal }}>
          📖 My Knowledge Base
        </h2>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
          Upload your MM books and videos — your AI and the entire app get smarter with every addition
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flexShrink: 0, padding: "8px 14px", borderRadius: 20,
              border: `1.5px solid ${tab === t.id ? C.sageDark : C.border}`,
              background: tab === t.id ? C.sageDark : "transparent",
              color: tab === t.id ? "#fff" : C.mid,
              fontFamily: "Georgia,serif", fontSize: 12, cursor: "pointer",
              fontWeight: tab === t.id ? 700 : 400,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Status message */}
      {status && (
        <div style={{
          padding: "11px 14px", borderRadius: 12, fontSize: 13, lineHeight: 1.6,
          background: status.ok ? C.sageLight : "#fef2f2",
          border: `1px solid ${status.ok ? C.sage : "#fca5a5"}40`,
          color: status.ok ? C.sageDark : "#dc2626",
        }}>
          {status.text}
        </div>
      )}

      {/* ── My Library ── */}
      {tab === "library" && (
        <div>
          {booksLoading ? (
            <div style={{ textAlign: "center", color: C.muted, padding: 32, fontSize: 13 }}>Loading your library…</div>
          ) : books.length === 0 ? (
            <Card>
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>📚</div>
                <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal, marginBottom: 8 }}>
                  Your library is empty
                </div>
                <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, marginBottom: 16 }}>
                  Upload a PDF of any MM book you own, paste a YouTube URL, or add a text note. Each addition makes your entire app smarter.
                </div>
                <Btn onClick={() => setTab("upload")} color={C.sageDark}>
                  Add your first book →
                </Btn>
              </div>
            </Card>
          ) : (
            <>
              <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal, marginBottom: 10 }}>
                {books.length} {books.length === 1 ? "source" : "sources"} in your library
              </div>
              {books.map((b) => (
                <BookCard key={b.id} book={b} onDelete={deleteBook} />
              ))}
              <div style={{ marginTop: 10 }}>
                <Btn full onClick={() => setTab("upload")} color={C.sage}>+ Add another book or video</Btn>
              </div>

              {/* Quick notes section */}
              {bookNotes.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal, marginBottom: 10 }}>
                    📝 Quick notes ({bookNotes.length})
                  </div>
                  {bookNotes.map((n) => (
                    <div key={n.id} style={{ background: C.mist, borderRadius: 12, padding: "10px 14px", marginBottom: 8, border: `1px solid ${C.border}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 11, background: C.sage, color: "#fff", borderRadius: 10, padding: "2px 8px", fontFamily: "Georgia,serif" }}>{n.source}</span>
                        <span style={{ fontSize: 11, color: C.muted }}>{n.date}</span>
                      </div>
                      <div style={{ fontSize: 12.5, color: C.charcoal, lineHeight: 1.6 }}>
                        {n.content.substring(0, 180)}{n.content.length > 180 ? "…" : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Upload PDF ── */}
      {tab === "upload" && (
        <Card>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal, marginBottom: 6 }}>
            Upload Your MM Book PDF
          </div>
          <div style={{ fontSize: 12.5, color: C.mid, lineHeight: 1.7, marginBottom: 16 }}>
            Upload a digital copy of any Anthony William book you own. The text is extracted, indexed, and stored privately on your account. The original PDF file is never stored — only the knowledge.
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: C.mid, marginBottom: 6, fontFamily: "Georgia,serif" }}>Book title</div>
            <input
              value={pdfTitle}
              onChange={(e) => setPdfTitle(e.target.value)}
              placeholder="e.g. Cleanse to Heal"
              style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: `1.5px solid ${C.border}`, fontFamily: "Georgia,serif", fontSize: 14, outline: "none", background: C.mist, boxSizing: "border-box" }}
            />
          </div>

          {/* Ownership confirmation */}
          <button
            onClick={() => setPdfOwned((v) => !v)}
            style={{
              display: "flex", alignItems: "flex-start", gap: 10,
              background: pdfOwned ? C.sageLight : C.mist,
              border: `1.5px solid ${pdfOwned ? C.sage : C.border}`,
              borderRadius: 12, padding: "12px 14px", cursor: "pointer",
              width: "100%", textAlign: "left", marginBottom: 14,
            }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: 5, flexShrink: 0, marginTop: 1,
              border: `2px solid ${pdfOwned ? C.sageDark : C.border}`,
              background: pdfOwned ? C.sageDark : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 12, fontWeight: 700,
            }}>
              {pdfOwned ? "✓" : ""}
            </div>
            <div style={{ fontSize: 12.5, color: C.charcoal, lineHeight: 1.5 }}>
              I confirm I own a legitimately purchased copy of this book and am uploading it only for my personal use within CelerySync.
            </div>
          </button>

          <input ref={fileRef} type="file" accept=".pdf" onChange={handlePdfSelect} style={{ display: "none" }} />
          <Btn
            full
            onClick={() => {
              if (!pdfOwned) return showStatus(false, "Please confirm you own this book first.");
              fileRef.current?.click();
            }}
            color={C.sageDark}
            disabled={working}
          >
            {working ? "🌿 Processing — please wait…" : "📄 Choose PDF File"}
          </Btn>

          <div style={{ marginTop: 10, fontSize: 11, color: C.muted, lineHeight: 1.6 }}>
            Works best with text-based PDFs (not scanned images). Most purchased ebooks are text-based.
          </div>

          {/* Also add a quick note option */}
          <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 20, paddingTop: 16 }}>
            <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13, color: C.charcoal, marginBottom: 8 }}>
              Or add a quick note from a book
            </div>
            <select
              value={bookSource}
              onChange={(e) => setBookSource(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: `1px solid ${C.border}`, fontFamily: "Georgia,serif", fontSize: 13, background: C.mist, marginBottom: 8, outline: "none" }}
            >
              {MM_BOOKS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <textarea
              value={bookInput}
              onChange={(e) => setBookInput(e.target.value)}
              placeholder="Paste a highlight or write a note from the book…"
              rows={3}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontFamily: "Georgia,serif", fontSize: 13, outline: "none", resize: "vertical", background: C.mist, boxSizing: "border-box" }}
            />
            <div style={{ marginTop: 8 }}>
              <Btn full onClick={handleQuickNote} disabled={working || !bookInput.trim()} color={C.sage}>
                {working ? "Saving…" : "Save Note"}
              </Btn>
            </div>
          </div>
        </Card>
      )}

      {/* ── YouTube ── */}
      {tab === "youtube" && (
        <Card>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal, marginBottom: 6 }}>
            Add an Anthony William YouTube Video
          </div>
          <div style={{ fontSize: 12.5, color: C.mid, lineHeight: 1.7, marginBottom: 16 }}>
            Paste any YouTube URL. We fetch the transcript automatically — no download needed. Anthony William's thousands of hours of teachings become searchable within your app.
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: C.mid, marginBottom: 6, fontFamily: "Georgia,serif" }}>Video title (optional)</div>
            <input
              value={ytTitle}
              onChange={(e) => setYtTitle(e.target.value)}
              placeholder="e.g. Anthony William on EBV and Thyroid"
              style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: `1.5px solid ${C.border}`, fontFamily: "Georgia,serif", fontSize: 14, outline: "none", background: C.mist, boxSizing: "border-box" }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: C.mid, marginBottom: 6, fontFamily: "Georgia,serif" }}>YouTube URL</div>
            <input
              value={ytUrl}
              onChange={(e) => setYtUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: `1.5px solid ${C.border}`, fontFamily: "Georgia,serif", fontSize: 14, outline: "none", background: C.mist, boxSizing: "border-box" }}
            />
          </div>

          <Btn full onClick={handleYoutube} disabled={working || !ytUrl.trim()} color="#dc2626">
            {working ? "▶️ Fetching transcript…" : "▶️ Add Video to Library"}
          </Btn>

          <div style={{ marginTop: 14 }}>
            <a
              href="https://youtube.com/@MedicalMedium"
              target="_blank" rel="noopener noreferrer"
              style={{ color: "#dc2626", fontSize: 13, fontFamily: "Georgia,serif", fontWeight: 700, textDecoration: "none" }}
            >
              ▶️ Browse Medical Medium YouTube →
            </a>
          </div>

          <div style={{ marginTop: 12, padding: "10px 12px", background: C.sageLight, borderRadius: 10, fontSize: 11.5, color: C.mid, lineHeight: 1.6 }}>
            💡 <strong>Tip:</strong> Start with Anthony William's most popular videos on your main conditions. You can add as many as you like — each one makes your AI more knowledgeable.
          </div>
        </Card>
      )}

      {/* ── Text Note ── */}
      {tab === "note" && (
        <Card>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal, marginBottom: 6 }}>
            Add a Text Note or Paste
          </div>
          <div style={{ fontSize: 12.5, color: C.mid, lineHeight: 1.7, marginBottom: 16 }}>
            Copy text from Anthony William's Instagram, Facebook, or podcast — paste it here and it becomes part of your knowledge base.
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: C.mid, marginBottom: 6, fontFamily: "Georgia,serif" }}>Title</div>
            <input
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="e.g. AW Instagram post on heavy metals"
              style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: `1.5px solid ${C.border}`, fontFamily: "Georgia,serif", fontSize: 14, outline: "none", background: C.mist, boxSizing: "border-box" }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: C.mid, marginBottom: 6, fontFamily: "Georgia,serif" }}>Content</div>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Paste the text here…"
              rows={6}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: `1.5px solid ${C.border}`, fontFamily: "Georgia,serif", fontSize: 13, outline: "none", resize: "vertical", background: C.mist, boxSizing: "border-box" }}
            />
          </div>

          <Btn full onClick={handleNote} disabled={working || !noteTitle.trim() || !noteText.trim()} color={C.sageDark}>
            {working ? "Saving…" : "📝 Add to Library"}
          </Btn>
        </Card>
      )}
    </div>
  );
}
