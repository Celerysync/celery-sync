import { useState, useCallback } from "react";

const API = "/api/books";

export function useBooks(authUser) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadBooks = useCallback(async () => {
    if (!authUser?.id) { setLoading(false); return; }
    try {
      const res = await fetch(`${API}?userId=${authUser.id}`);
      const data = await res.json();
      if (data.books) setBooks(data.books);
    } catch (e) {
      console.warn("Load books:", e.message);
    }
    setLoading(false);
  }, [authUser?.id]);

  const uploadPdf = useCallback(async (file, title, onProgress) => {
    if (!authUser?.id) return null;
    const form = new FormData();
    form.append("file", file);
    form.append("userId", authUser.id);
    form.append("title", title || file.name.replace(".pdf", ""));
    form.append("owned", "true");
    onProgress?.("Uploading…");
    const res = await fetch(`${API}/upload`, { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    onProgress?.("Done");
    setBooks((prev) => [data.book, ...prev]);
    return data.book;
  }, [authUser?.id]);

  const addYoutube = useCallback(async (url, title, onProgress) => {
    if (!authUser?.id) return null;
    onProgress?.("Fetching transcript…");
    const res = await fetch(`${API}/youtube`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: authUser.id, url, title }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed");
    onProgress?.("Done");
    setBooks((prev) => [data.book, ...prev]);
    return data.book;
  }, [authUser?.id]);

  const addNote = useCallback(async (title, text) => {
    if (!authUser?.id) return null;
    const res = await fetch(`${API}/note`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: authUser.id, title, text }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed");
    setBooks((prev) => [data.book, ...prev]);
    return data.book;
  }, [authUser?.id]);

  const deleteBook = useCallback(async (id) => {
    if (!authUser?.id) return;
    await fetch(`${API}/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: authUser.id }),
    });
    setBooks((prev) => prev.filter((b) => b.id !== id));
  }, [authUser?.id]);

  const searchBooks = useCallback(async (query) => {
    if (!authUser?.id || !query?.trim()) return [];
    try {
      const res = await fetch(`${API}/search?q=${encodeURIComponent(query)}&userId=${authUser.id}`);
      const data = await res.json();
      return data.chunks || [];
    } catch {
      return [];
    }
  }, [authUser?.id]);

  return { books, loading, loadBooks, uploadPdf, addYoutube, addNote, deleteBook, searchBooks };
}
