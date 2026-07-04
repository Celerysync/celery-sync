import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'

const router = Router()
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const MODELS = {
  quick:    'claude-haiku-4-5-20251001', // daily check-ins, follow-ups, short lookups
  standard: 'claude-sonnet-4-6',         // most conversation turns (resolveModel picks this for health queries)
  deep:     'claude-opus-4-8',           // practitioner protocol generation only
}

// Keywords that escalate a standard-tier request to Opus-class reasoning.
// Sonnet handles the vast majority; only genuinely complex multi-condition or
// longitudinal queries need the stronger model.
const DEEP_SIGNALS = /interpret.*week|weeks? of (data|symptoms?|history)|multi.?condition|complex.*protocol|why (am i|is my|are my).*still|progress over|trend|pattern over|not improving|getting worse|compare.*months?|analyse my|analyse my journey/i

// Lightweight router — picks the cheapest model that can do the job.
// quick tier: forced Haiku (summaries, follow-up chips, welcome replies, short voice)
// deep tier: forced Opus (practitioner portal only)
// standard: smart routing — Sonnet for health questions, Haiku for trivial messages
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

  // Longitudinal / multi-condition reasoning → escalate to Opus
  if (DEEP_SIGNALS.test(text)) return MODELS.deep

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

const CACHE_HEADERS = { 'anthropic-beta': 'prompt-caching-2024-07-31' }

router.post('/', async (req, res) => {
  const { system, staticSystem, dynamicSystem, messages, maxTokens = 900, tier = 'standard' } = req.body
  if (!messages?.length) return res.status(400).json({ error: 'messages required' })

  try {
    const model = resolveModel(tier, messages)
    const systemParam = buildSystemParam({ system, staticSystem, dynamicSystem })
    console.log(`🤖 [${tier}] → ${model.split('-').slice(1,3).join('-')} | cache=${!!staticSystem} (${messages[messages.length-1]?.content?.slice?.(0,60) ?? ''}…)`)

    const response = await anthropic.messages.create(
      { model, max_tokens: maxTokens, messages, ...(systemParam ? { system: systemParam } : {}) },
      { headers: CACHE_HEADERS }
    )
    res.json({ text: response.content.find(b => b.type === 'text')?.text ?? '' })
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

    const stream = anthropic.messages.stream(
      { model, max_tokens: maxTokens, messages, ...(systemParam ? { system: systemParam } : {}) },
      { headers: CACHE_HEADERS }
    )

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ delta: event.delta.text })}\n\n`)
      }
    }
    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
    res.end()
  }
})

export default router
