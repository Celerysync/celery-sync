import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import { fetchAccessToken, HumeClient } from 'hume'
import { createHash } from 'crypto'

const router = Router()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

let _humeClient = null
function humeClient() {
  if (!process.env.HUME_API_KEY) return null
  if (!_humeClient) _humeClient = new HumeClient({ apiKey: process.env.HUME_API_KEY })
  return _humeClient
}

// Short-lived Hume access token — the client never sees HUME_API_KEY/HUME_SECRET_KEY.
// Called once per session-mount (app load), not per turn.
router.post('/token', async (req, res) => {
  try {
    const accessToken = await fetchAccessToken({
      apiKey: process.env.HUME_API_KEY,
      secretKey: process.env.HUME_SECRET_KEY,
    })
    if (!accessToken) return res.status(502).json({ error: 'Hume did not return an access token' })
    res.json({ accessToken })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Exposes the EVI Configuration ID (not a credential — safe to hand to the
// client, but server-supplied so a config swap never needs a client redeploy).
router.get('/config', (_req, res) => {
  res.json({ configId: process.env.HUME_EVI_CONFIG_ID || null })
})

// ── Octave TTS (spec §3.1 — the cheap one-way audio layer) ────────────────
// Same cache pattern as /api/elevenlabs/speak: sha256(voice+text) → tts_cache
// row → public mp3 in the tts-audio bucket, so repeated lines (greetings,
// nudges, wrap-ups) cost characters exactly once per voice.

function cleanText(text) {
  return text
    .replace(/[#*_`•→]/g, '')
    .replace(/\n+/g, '. ')
    .replace(/\s+/g, ' ')
    .trim()
}

router.post('/tts', async (req, res) => {
  const { text, voiceId, provider = 'HUME_AI' } = req.body
  if (!text?.trim()) return res.status(400).json({ error: 'text required' })
  if (!voiceId) return res.status(400).json({ error: 'voiceId required' })
  if (!['HUME_AI', 'CUSTOM_VOICE'].includes(provider)) {
    return res.status(400).json({ error: 'provider must be HUME_AI or CUSTOM_VOICE' })
  }

  const client = humeClient()
  if (!client) return res.status(503).json({ error: 'Hume TTS not configured — set HUME_API_KEY' })

  const clean = cleanText(text)
  // 'hume:' prefix keeps these hashes from ever colliding with ElevenLabs
  // entries in the shared tts_cache table.
  const hash = createHash('sha256').update(`hume:${provider}:${voiceId}:${clean}`).digest('hex')

  try {
    const { data: cached } = await supabase
      .from('tts_cache')
      .select('audio_url')
      .eq('hash', hash)
      .single()
    if (cached?.audio_url) return res.json({ url: cached.audio_url, cached: true })
  } catch {
    // Cache lookup failed — continue to generate fresh audio
  }

  try {
    const result = await client.tts.synthesizeJson({
      utterances: [{ text: clean, voice: { id: voiceId, provider } }],
      format: { type: 'mp3' },
    })
    const b64 = result?.generations?.[0]?.audio
    if (!b64) return res.status(502).json({ error: 'Hume returned no audio' })
    const audioBuffer = Buffer.from(b64, 'base64')

    const filename = `${hash}.mp3`
    const { error: uploadError } = await supabase.storage
      .from('tts-audio')
      .upload(filename, audioBuffer, { contentType: 'audio/mpeg', upsert: false })

    // 409/duplicate is fine — file already exists from a race condition
    const uploadOk = !uploadError || uploadError.statusCode === '409'
    if (uploadOk) {
      const { data: urlData } = supabase.storage.from('tts-audio').getPublicUrl(filename)
      await supabase.from('tts_cache').upsert(
        { hash, audio_url: urlData.publicUrl, voice_id: `hume:${voiceId}`, char_count: clean.length },
        { onConflict: 'hash' }
      )
      return res.json({ url: urlData.publicUrl, cached: false })
    }

    // Storage failed — return audio as base64 data URL (fallback, rarely triggered)
    console.error('Supabase storage upload failed:', uploadError?.message)
    return res.json({ url: `data:audio/mpeg;base64,${b64}`, cached: false })
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message })
  }
})

// Curated companion voices (spec §3.4: 4–6 CelerySync voices, not the whole
// Hume library). Custom voices saved in our Hume account are the curated set;
// until those exist, HUME_CURATED_VOICE_NAMES (comma-separated) or simply the
// first few library voices keep the picker working.
const VOICES_CACHE_MS = 60 * 60 * 1000
let _voicesCache = { at: 0, voices: null }

async function listVoices(client, provider, max = 40) {
  const out = []
  try {
    const page = await client.tts.voices.list({ provider, pageSize: Math.min(max, 100) })
    for await (const v of page) {
      out.push({ id: v.id, name: v.name, provider })
      if (out.length >= max) break
    }
  } catch (err) {
    console.warn(`Hume voices list (${provider}) failed:`, err.message)
  }
  return out
}

router.get('/voices', async (_req, res) => {
  if (_voicesCache.voices && Date.now() - _voicesCache.at < VOICES_CACHE_MS) {
    return res.json({ voices: _voicesCache.voices })
  }
  const client = humeClient()
  if (!client) return res.status(503).json({ error: 'Hume TTS not configured — set HUME_API_KEY' })

  const custom = await listVoices(client, 'CUSTOM_VOICE')
  let voices
  if (custom.length > 0) {
    voices = custom.slice(0, 6)
  } else {
    const library = await listVoices(client, 'HUME_AI')
    const curatedNames = (process.env.HUME_CURATED_VOICE_NAMES || '')
      .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    voices = curatedNames.length
      ? library.filter((v) => curatedNames.includes(v.name.toLowerCase()))
      : library.slice(0, 6)
  }

  if (voices.length > 0) _voicesCache = { at: Date.now(), voices }
  res.json({ voices })
})

// ── Usage metering (spec §2.4) ────────────────────────────────────────────
// voice_usage_meter's RLS only grants users SELECT on their own row — all
// writes go through here (service role), so a user can never inflate their
// own remaining minutes by writing the meter directly from the client.

// Placeholder default until real plans/Stripe pricing locks — matches the
// spec's stated "~150 EVI min included" placeholder (docs/CELERYSYNC_COMPANION_SPEC.md).
const DEFAULT_INCLUDED_SECONDS = 150 * 60
// Free-trial users (no subscription row) get a bounded taste of voice — enough
// for the welcome tour + several mornings of hands-free ticking, but voice is
// the app's only per-minute cost and an uncapped trial is an open tab.
const TRIAL_INCLUDED_SECONDS = 20 * 60

// Circuit breaker: per-trial caps bound ONE stranger, but 1000 simultaneous
// trials would still be 1000 × the cap with zero revenue. This bounds the
// TOTAL voice all trial users combined can burn per month; once tripped, new
// trial sessions get no voice minutes (text chat unaffected) until next month
// or a raised limit. Trial meter rows are identifiable by their included
// allowance. Cached 5 minutes — the breaker may overshoot by one cache window.
const TRIAL_GLOBAL_VOICE_SECONDS =
  (parseInt(process.env.TRIAL_GLOBAL_VOICE_MINUTES, 10) || 300) * 60
let trialPoolCache = { total: 0, fetchedAt: 0 }

async function trialPoolExhausted() {
  if (Date.now() - trialPoolCache.fetchedAt > 5 * 60_000) {
    const { data } = await supabase
      .from('voice_usage_meter')
      .select('evi_seconds_used')
      .eq('period_month', currentPeriodMonth())
      .eq('evi_seconds_included', TRIAL_INCLUDED_SECONDS)
    const total = (data || []).reduce((sum, r) => sum + (r.evi_seconds_used || 0), 0)
    trialPoolCache = { total, fetchedAt: Date.now() }
  }
  return trialPoolCache.total >= TRIAL_GLOBAL_VOICE_SECONDS
}

// Recomputed on every metering write (not just row creation) so subscribing
// mid-month instantly lifts the allowance from trial to full.
async function includedSecondsFor(userId) {
  try {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', userId)
      .maybeSingle()
    if (sub?.status === 'active' || sub?.status === 'trialing') return DEFAULT_INCLUDED_SECONDS

    // The admin/owner account has no subscription row but is not a trial user
    if (process.env.ADMIN_EMAIL) {
      const { data: userRes } = await supabase.auth.admin.getUserById(userId)
      if (userRes?.user?.email?.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase()) {
        return DEFAULT_INCLUDED_SECONDS
      }
    }
    if (await trialPoolExhausted()) return 0
    return TRIAL_INCLUDED_SECONDS
  } catch (err) {
    // Fail open: never shrink a paying user's allowance over a lookup hiccup
    console.warn('includedSecondsFor failed:', err.message)
    return DEFAULT_INCLUDED_SECONDS
  }
}

function currentPeriodMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

async function incrementMeterUsage(userId, secondsToAdd) {
  const periodMonth = currentPeriodMonth()
  const { data: existing } = await supabase
    .from('voice_usage_meter')
    .select('evi_seconds_used, evi_seconds_included, topup_seconds_remaining')
    .eq('user_id', userId)
    .eq('period_month', periodMonth)
    .maybeSingle()

  const included = await includedSecondsFor(userId)
  const topup = existing?.topup_seconds_remaining ?? 0
  const used = (existing?.evi_seconds_used ?? 0) + Math.max(0, Math.round(secondsToAdd))

  await supabase.from('voice_usage_meter').upsert({
    user_id: userId,
    period_month: periodMonth,
    evi_seconds_used: used,
    evi_seconds_included: included,
    topup_seconds_remaining: topup,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,period_month' })

  return { used, included, topup, remainingSeconds: Math.max(0, included + topup - used) }
}

// Authoritative pre-connect allowance check. The client gates connect() on
// this, NOT on its own read of the meter row — a brand-new user has no row
// yet, and only the server knows the subscription tier and the trial pool
// breaker state. A zero-second increment creates the row with the right
// allowance as a side effect, so the gauge works from the very first session.
router.get('/allowance', async (req, res) => {
  const { userId } = req.query
  if (!userId) return res.status(400).json({ error: 'userId required' })
  try {
    const meter = await incrementMeterUsage(userId, 0)
    res.json({ remainingSeconds: meter.remainingSeconds })
  } catch (err) {
    // Fail open — never let an allowance-check hiccup lock a paying user out
    console.warn('allowance check failed:', err.message)
    res.status(200).json({ remainingSeconds: null })
  }
})

// One row per live EVI session (spec §2.3) — created on connect, closed on
// disconnect. Session tracking must never block the actual voice session,
// so every handler here fails soft (200 + ok:false) rather than throwing.
router.post('/session/start', async (req, res) => {
  const { userId, profileId } = req.body
  if (!userId) return res.status(400).json({ error: 'userId required' })
  try {
    const { data, error } = await supabase.from('companion_sessions').insert({
      user_id: userId,
      profile_id: profileId || null,
      started_at: new Date().toISOString(),
    }).select('id').single()
    if (error) throw error
    res.json({ sessionId: data.id })
  } catch (err) {
    console.warn('session/start failed:', err.message)
    res.status(200).json({ sessionId: null })
  }
})

// Called every 60s while a session is open, so a crash mid-session can't
// lose metering (only the last <60s goes unmetered in the worst case).
router.post('/session/heartbeat', async (req, res) => {
  const { userId, seconds } = req.body
  if (!userId || !seconds) return res.status(400).json({ error: 'userId and seconds required' })
  try {
    const meter = await incrementMeterUsage(userId, seconds)
    res.json({ ok: true, ...meter })
  } catch (err) {
    console.warn('session/heartbeat failed:', err.message)
    res.status(200).json({ ok: false })
  }
})

router.post('/session/end', async (req, res) => {
  const { sessionId, userId, seconds, transcriptSummary } = req.body
  try {
    if (userId && seconds) await incrementMeterUsage(userId, seconds)
    if (sessionId) {
      const { data: session } = await supabase
        .from('companion_sessions')
        .select('started_at')
        .eq('id', sessionId)
        .maybeSingle()
      const durationSeconds = session
        ? Math.round((Date.now() - new Date(session.started_at).getTime()) / 1000)
        : null
      await supabase.from('companion_sessions').update({
        ended_at: new Date().toISOString(),
        duration_seconds: durationSeconds,
        transcript_summary: transcriptSummary || null,
      }).eq('id', sessionId)
    }
    res.json({ ok: true })
  } catch (err) {
    console.warn('session/end failed:', err.message)
    res.status(200).json({ ok: false })
  }
})

// One row per conversational turn, from every voice surface app-wide —
// this is the logging that didn't exist before the Hume migration.
router.post('/log', async (req, res) => {
  // emotion scores are never accepted or stored (spec §3.5) — Hume's prosody
  // data may only shape tone live, in-session.
  const {
    userId, profileId, surface,
    userTranscript, assistantTranscript,
    latencyMs, toolCalls,
    success = true, errorMessage, humeChatId,
  } = req.body

  if (!userId) return res.status(400).json({ error: 'userId required' })

  try {
    const { error } = await supabase.from('voice_turns').insert({
      user_id: userId,
      profile_id: profileId || null,
      surface: surface || 'unknown',
      user_transcript: userTranscript || null,
      assistant_transcript: assistantTranscript || null,
      latency_ms: latencyMs ?? null,
      tool_calls: toolCalls ?? null,
      success,
      error_message: errorMessage || null,
      hume_chat_id: humeChatId || null,
    })
    if (error) throw error
    res.json({ ok: true })
  } catch (err) {
    // Logging must never break the voice experience — fail soft.
    console.warn('voice_turns insert failed:', err.message)
    res.status(200).json({ ok: false })
  }
})

export default router
