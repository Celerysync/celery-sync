import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import { fetchAccessToken } from 'hume'

const router = Router()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

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

// ── Usage metering (spec §2.4) ────────────────────────────────────────────
// voice_usage_meter's RLS only grants users SELECT on their own row — all
// writes go through here (service role), so a user can never inflate their
// own remaining minutes by writing the meter directly from the client.

// Placeholder default until real plans/Stripe pricing locks — matches the
// spec's stated "~150 EVI min included" placeholder (docs/CELERYSYNC_COMPANION_SPEC.md).
const DEFAULT_INCLUDED_SECONDS = 150 * 60

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

  const included = existing?.evi_seconds_included ?? DEFAULT_INCLUDED_SECONDS
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
  const {
    userId, profileId, surface,
    userTranscript, assistantTranscript,
    latencyMs, emotionScores, toolCalls,
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
      emotion_scores: emotionScores ?? null,
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
