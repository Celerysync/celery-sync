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
