import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'

const router = Router()
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const MODELS = {
  quick:    'claude-haiku-4-5-20251001', // daily check-ins, follow-ups, short lookups
  standard: 'claude-sonnet-5-5',         // most conversation turns — newer than 4.6 and ~1/3 cheaper ($2/$10 vs $3/$15 per MTok)
  deep:     'claude-opus-4-8',           // practitioner protocol generation only
}

// Lightweight router — picks the cheapest model that can do the job.
// quick tier: forced Haiku (summaries, follow-up chips, welcome replies, short voice)
// deep tier: forced Opus (practitioner portal only)
// standard: Haiku for very short messages, Sonnet for the rest. (Escalating
// "trend / getting worse" questions to Opus was dropped 2026-11-01: the app's
// answers are descriptive-only, Sonnet 5.5 handles them, and Opus cost ~2.5x.)
function resolveModel(tier, messages = []) {
  if (tier === 'quick') return MODELS.quick
  if (tier === 'deep')  return MODELS.deep

  const lastUser = [...messages].reverse().find(m => m.role === 'user')
  const text = typeof lastUser?.content === 'string'
    ? lastUser.content
    : (lastUser?.content?.find?.(b => b.type === 'text')?.text ?? '')
  const words = text.trim().split(/\s+/).length

  // Very short messages are always conversational → Haiku
  if (words <= 10) return MODELS.quick

  // Everything else with medical content → Sonnet
  return MODELS.standard
}

// Build the system param: when a static/dynamic split is provided, mark the
// static block for prompt caching so the large knowledge base is paid for once.
function buildSystemParam({ system, staticSystem, dynamicSystem }) {
  if (staticSystem) {
    const parts = [{ type: 'text', text: staticSystem, cache_control: { type: 'ephemeral' } }]
    if (dynamicSystem) parts.push({ type: 'text', text: dynamicSystem })
    return parts
  }
  return system || undefined
}

// Per-model request shape. Sonnet 5.5 thinks by default, which would eat the
// small max_tokens a chat reply gets and delay the first words — this is a
// short, warm helper, so thinking stays off ('between_tools' with no tools)
// at low effort. It also gets Anthropic's server-side fallback: if it ever
// declines, another model answers in the same call. (Prompt caching is GA —
// the old caching beta header is no longer needed.)
function requestFor(model, base) {
  if (model === 'claude-sonnet-5-5') {
    return {
      api: anthropic.beta.messages,
      params: {
        ...base,
        thinking: { type: 'between_tools' },
        output_config: { effort: 'low' },
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
      },
    }
  }
  return { api: anthropic.messages, params: base }
}

// If the whole chain declines (rare), say something kind instead of nothing.
const DECLINED_TEXT = "I'm not able to help with that one — but I'm here for anything to do with your routine, your check-ins or finding your way around the app."

router.post('/', async (req, res) => {
  const { system, staticSystem, dynamicSystem, messages, maxTokens = 900, tier = 'standard' } = req.body
  if (!messages?.length) return res.status(400).json({ error: 'messages required' })

  try {
    const model = resolveModel(tier, messages)
    const systemParam = buildSystemParam({ system, staticSystem, dynamicSystem })
    console.log(`🤖 [${tier}] → ${model.split('-').slice(1,3).join('-')} | cache=${!!staticSystem} (${messages[messages.length-1]?.content?.slice?.(0,60) ?? ''}…)`)

    const { api, params } = requestFor(model, { model, max_tokens: maxTokens, messages, ...(systemParam ? { system: systemParam } : {}) })
    const response = await api.create(params, { timeout: 30000 })
    const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('')
    res.json({ text: text || (response.stop_reason === 'refusal' ? DECLINED_TEXT : '') })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Typed chat's action step: the same tools spoken Fern has. The app runs any
// tool the model asks for, under the person's own login (RLS), exactly as
// voice does, then sends the results back here. This route only relays: it
// never touches data itself. Haiku, with the tool list cached.
router.post('/tools', async (req, res) => {
  const { system, messages, tools } = req.body || {}
  if (!messages?.length) return res.status(400).json({ error: 'messages required' })
  if (!Array.isArray(tools) || !tools.length || tools.length > 50) return res.status(400).json({ error: 'tools required' })
  if (messages.length > 40 || JSON.stringify(req.body).length > 200_000) return res.status(413).json({ error: 'too large' })
  try {
    const cachedTools = tools.map((t, i) => (i === tools.length - 1 ? { ...t, cache_control: { type: 'ephemeral' } } : t))
    const response = await anthropic.messages.create({
      model: MODELS.quick,
      max_tokens: 1024,
      system: system || undefined,
      tools: cachedTools,
      messages,
    }, { timeout: 30000 })
    res.json({ content: response.content, stop_reason: response.stop_reason })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/stream', async (req, res) => {
  const { system, staticSystem, dynamicSystem, messages, maxTokens = 900, tier = 'standard' } = req.body
  if (!messages?.length) return res.status(400).json({ error: 'messages required' })

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  try {
    const model = resolveModel(tier, messages)
    const systemParam = buildSystemParam({ system, staticSystem, dynamicSystem })
    console.log(`🤖 [stream/${tier}] → ${model.split('-').slice(1,3).join('-')} | cache=${!!staticSystem}`)

    const { api, params } = requestFor(model, { model, max_tokens: maxTokens, messages, ...(systemParam ? { system: systemParam } : {}) })
    const stream = api.stream(params, { timeout: 60000 })

    let wroteText = false
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        wroteText = true
        res.write(`data: ${JSON.stringify({ delta: event.delta.text })}\n\n`)
      }
    }
    if (!wroteText) {
      const final = await stream.finalMessage().catch(() => null)
      if (final?.stop_reason === 'refusal') res.write(`data: ${JSON.stringify({ delta: DECLINED_TEXT })}\n\n`)
    }
    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
    res.end()
  }
})

export default router
