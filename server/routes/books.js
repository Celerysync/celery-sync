import express from 'express'
import multer from 'multer'
import { createClient } from '@supabase/supabase-js'
import { YoutubeTranscript } from 'youtube-transcript'

const router = express.Router()

// Memory storage — we extract text then discard the file, never save to disk
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ─── Text chunking ────────────────────────────────────────────────────────────
function chunkText(text, chunkSize = 600, overlap = 80) {
  const words = text.split(/\s+/).filter(Boolean)
  const chunks = []
  let i = 0
  while (i < words.length) {
    chunks.push(words.slice(i, i + chunkSize).join(' '))
    i += chunkSize - overlap
  }
  return chunks
}

function extractYoutubeId(url) {
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/)
  return match ? match[1] : null
}

function cleanText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[^\S\n]+/g, ' ')
    .trim()
}

// ─── Shared: store book + chunks ──────────────────────────────────────────────
async function storeBook({ userId, title, sourceType, sourceUrl, text, pageCount }) {
  const cleaned = cleanText(text)
  const chunks = chunkText(cleaned)

  // Insert book record
  const { data: book, error: bookErr } = await supabase
    .from('user_books')
    .insert({
      user_id: userId,
      title,
      source_type: sourceType,
      source_url: sourceUrl || null,
      page_count: pageCount || 0,
      chunk_count: chunks.length,
      status: 'ready',
    })
    .select()
    .single()

  if (bookErr) throw new Error(bookErr.message)

  // Insert chunks in batches of 50
  const rows = chunks.map((content, i) => ({
    user_id: userId,
    book_id: book.id,
    content,
    chunk_index: i,
  }))

  for (let i = 0; i < rows.length; i += 50) {
    const { error } = await supabase.from('book_chunks').insert(rows.slice(i, i + 50))
    if (error) throw new Error(error.message)
  }

  return { ...book, chunk_count: chunks.length }
}

// ─── POST /api/books/upload — PDF ────────────────────────────────────────────
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { userId, title, owned } = req.body
    if (!userId) return res.status(400).json({ error: 'userId required' })
    if (!owned || owned !== 'true') return res.status(400).json({ error: 'Ownership confirmation required' })
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    if (req.file.mimetype !== 'application/pdf') return res.status(400).json({ error: 'PDF files only' })

    // Lazy import pdf-parse (CommonJS module)
    const { default: pdfParse } = await import('pdf-parse/lib/pdf-parse.js')
    const parsed = await pdfParse(req.file.buffer)

    if (!parsed.text?.trim()) return res.status(400).json({ error: 'Could not extract text from this PDF. Try a text-based PDF (not a scanned image).' })

    const book = await storeBook({
      userId,
      title: title || req.file.originalname.replace('.pdf', ''),
      sourceType: 'pdf',
      text: parsed.text,
      pageCount: parsed.numpages,
    })

    res.json({ ok: true, book })
  } catch (err) {
    console.error('PDF upload error:', err)
    res.status(500).json({ error: err.message })
  }
})

// ─── POST /api/books/youtube — YouTube transcript ─────────────────────────────
router.post('/youtube', async (req, res) => {
  try {
    const { userId, url, title } = req.body
    if (!userId || !url) return res.status(400).json({ error: 'userId and url required' })

    const videoId = extractYoutubeId(url)
    if (!videoId) return res.status(400).json({ error: 'Invalid YouTube URL' })

    let transcript
    try {
      transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' })
    } catch {
      return res.status(400).json({ error: 'No transcript available for this video. Try another video.' })
    }

    const text = transcript.map(t => t.text).join(' ')
    if (!text.trim()) return res.status(400).json({ error: 'Transcript is empty' })

    const book = await storeBook({
      userId,
      title: title || `YouTube: ${videoId}`,
      sourceType: 'youtube',
      sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
      text,
      pageCount: 0,
    })

    res.json({ ok: true, book })
  } catch (err) {
    console.error('YouTube error:', err)
    res.status(500).json({ error: err.message })
  }
})

// ─── POST /api/books/note — pasted text ──────────────────────────────────────
router.post('/note', async (req, res) => {
  try {
    const { userId, title, text } = req.body
    if (!userId || !title || !text) return res.status(400).json({ error: 'userId, title and text required' })

    const book = await storeBook({ userId, title, sourceType: 'note', text })
    res.json({ ok: true, book })
  } catch (err) {
    console.error('Note error:', err)
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /api/books?userId=xxx — list books ───────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query
    if (!userId) return res.status(400).json({ error: 'userId required' })
    const { data, error } = await supabase
      .from('user_books')
      .select('id, title, source_type, source_url, page_count, chunk_count, status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    res.json({ books: data || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── DELETE /api/books/:id ────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { userId } = req.body
    if (!userId) return res.status(400).json({ error: 'userId required' })
    await supabase.from('user_books').delete().eq('id', req.params.id).eq('user_id', userId)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /api/books/search?q=query&userId=xxx — full-text search ──────────────
router.get('/search', async (req, res) => {
  try {
    const { q, userId } = req.query
    if (!q || !userId) return res.status(400).json({ error: 'q and userId required' })

    const { data, error } = await supabase
      .from('book_chunks')
      .select('content, book_id, chunk_index, user_books(title, source_type)')
      .eq('user_id', userId)
      .textSearch('search_vector', q.replace(/[^a-zA-Z0-9\s]/g, '').split(' ').filter(Boolean).join(' | '), { type: 'websearch' })
      .limit(6)

    if (error) throw error
    res.json({ chunks: data || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
