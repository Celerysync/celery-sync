import { VOICE_PROVIDER } from './env.js'

// Voice provider abstraction — hosted TTS voices are identified by a prefix
// on the voice ref, so ElevenLabs and Hume Octave coexist per-voice instead
// of per-build:
//   'el:<voiceId>'                     → /api/elevenlabs/speak
//   'hume:<PROVIDER>:<voiceId>'        → /api/hume/tts  (PROVIDER = HUME_AI | CUSTOM_VOICE)
//   anything else                      → browser speechSynthesis fallback
// Set VITE_VOICE_PROVIDER=browser to force the browser fallback everywhere.
//
// Provider interface (unchanged from the single-provider days, so useVoice
// needs no edits):
//   isElVoice(voiceRef: string): boolean   — "is this a hosted TTS voice?"
//   extractVoiceId(voiceRef: string): string
//   fetchAudioUrl(text: string, voiceRef: string): Promise<string|null>

export const VOICE_CONFIG = {
  provider: VOICE_PROVIDER,
  elevenLabs: {
    apiEndpoint: '/api/elevenlabs/speak',
  },
  hume: {
    apiEndpoint: '/api/hume/tts',
  },
}

async function postForAudioUrl(endpoint, body) {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) return null
    const d = await res.json()
    return d?.url ?? null
  } catch {
    return null
  }
}

function routingProvider(config) {
  return {
    name: 'routing',
    isElVoice: (v) => typeof v === 'string' && (v.startsWith('el:') || v.startsWith('hume:')),
    // The full prefixed ref passes through — fetchAudioUrl routes on it, so
    // callers never need to know which hosted provider a voice belongs to.
    extractVoiceId: (v) => v,
    async fetchAudioUrl(text, voiceRef) {
      if (typeof voiceRef !== 'string') return null
      if (voiceRef.startsWith('el:')) {
        return postForAudioUrl(config.elevenLabs.apiEndpoint, {
          text,
          voiceId: voiceRef.slice(3),
        })
      }
      if (voiceRef.startsWith('hume:')) {
        const [, provider, voiceId] = voiceRef.split(':')
        if (!provider || !voiceId) return null
        return postForAudioUrl(config.hume.apiEndpoint, { text, voiceId, provider })
      }
      return null
    },
  }
}

function browserProvider() {
  return {
    name: 'browser',
    isElVoice: () => false,
    extractVoiceId: (v) => v,
    fetchAudioUrl: async () => null,
  }
}

export function createVoiceProvider(config = VOICE_CONFIG) {
  switch (config.provider) {
    case 'browser': return browserProvider()
    default:        return routingProvider(config)
  }
}

// Singleton — change VITE_VOICE_PROVIDER + rebuild to swap provider
export const ttsProvider = createVoiceProvider()
