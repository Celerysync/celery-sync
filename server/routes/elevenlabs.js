import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

const router = Router()
const BASE = 'https://api.elevenlabs.io/v1'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function hashKey(voiceId, text) {
  return createHash('sha256').update(`${voiceId}:${text}`).digest('hex')
}

function cleanText(text) {
  return text
    .replace(/[#*_`•→]/g, '')
    .replace(/\n+/g, '. ')
    .replace(/\s+/g, ' ')
    .trim()
}

router.post('/speak', async (req, res) => {
  const { text, voiceId = '21m00Tcm4TlvDq8ikWAM' } = req.body
  if (!text?.trim()) return res.status(400).json({ error: 'text required' })

  const clean = cleanText(text)
  const hash = hashKey(voiceId, clean)

  // ── Cache check ──────────────────────────────────────────────────────────
  try {
    const { data: cached } = await supabase
      .from('tts_cache')
      .select('audio_url')
      .eq('hash', hash)
      .single()

    if (cached?.audio_url) {
      return res.json({ url: cached.audio_url, cached: true })
    }
  } catch {
    // Cache lookup failed — continue to generate fresh audio
  }

  // ── Cache miss: call ElevenLabs ──────────────────────────────────────────
  try {
    const upstream = await fetch(`${BASE}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: clean,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      }),
    })

    if (!upstream.ok) {
      const err = await upstream.json().catch(() => ({}))
      return res.status(upstream.status).json({
        error: err?.detail?.message || 'ElevenLabs error',
      })
    }

    const audioBuffer = await upstream.arrayBuffer()
    const filename = `${hash}.mp3`

    // ── Upload to Supabase Storage ────────────────────────────────────────
    const { error: uploadError } = await supabase.storage
      .from('tts-audio')
      .upload(filename, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: false,        // don't overwrite if another request raced us
      })

    // 409/duplicate is fine — file already exists from a race condition
    const uploadOk = !uploadError || uploadError.statusCode === '409'

    if (uploadOk) {
      const { data: urlData } = supabase.storage
        .from('tts-audio')
        .getPublicUrl(filename)

      const audioUrl = urlData.publicUrl

      // Save to lookup table (upsert handles race conditions)
      await supabase.from('tts_cache').upsert(
        { hash, audio_url: audioUrl, voice_id: voiceId, char_count: clean.length },
        { onConflict: 'hash' }
      )

      return res.json({ url: audioUrl, cached: false })
    }

    // Storage failed — return audio as base64 data URL (fallback, rarely triggered)
    console.error('Supabase storage upload failed:', uploadError?.message)
    const b64 = Buffer.from(audioBuffer).toString('base64')
    return res.json({ url: `data:audio/mpeg;base64,${b64}`, cached: false })

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
