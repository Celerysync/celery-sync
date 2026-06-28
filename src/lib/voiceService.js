// Voice provider abstraction — swap providers by setting VITE_VOICE_PROVIDER env var.
// Supported: 'elevenlabs' (default), 'browser'
// Future providers: add a new case in createVoiceProvider() — no other changes needed.
//
// Provider interface:
//   isElVoice(voiceName: string): boolean
//   extractVoiceId(voiceName: string): string
//   fetchAudioUrl(text: string, voiceId: string): Promise<string|null>

export const VOICE_CONFIG = {
  provider: import.meta.env.VITE_VOICE_PROVIDER || 'elevenlabs',
  elevenLabs: {
    apiEndpoint: '/api/elevenlabs/speak',
  },
}

function elevenLabsProvider(config) {
  return {
    name: 'elevenlabs',
    isElVoice: (v) => typeof v === 'string' && v.startsWith('el:'),
    extractVoiceId: (v) => v.slice(3),
    async fetchAudioUrl(text, voiceId) {
      try {
        const res = await fetch(config.elevenLabs.apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voiceId }),
        })
        if (!res.ok) return null
        const d = await res.json()
        return d?.url ?? null
      } catch {
        return null
      }
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
    case 'elevenlabs':
    default:        return elevenLabsProvider(config)
  }
}

// Singleton — change VITE_VOICE_PROVIDER + rebuild to swap provider
export const ttsProvider = createVoiceProvider()
