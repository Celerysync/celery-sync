import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'

const router = Router()
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const MODELS = {
  quick:    'claude-sonnet-4-6',  // summaries, welcome replies, recipes
  standard: 'claude-opus-4-8',   // complex health guidance, symptoms, protocols
  deep:     'claude-opus-4-8',   // practitioner protocol generation
}

// Keywords that signal a question needs Opus-level reasoning
const OPUS_SIGNALS = /symptom|protocol|supplement|dosage|cleanse|detox|condition|thyroid|liver|kidney|adrenal|virus|bacteria|epstein|barr|autoimmune|heavy.?metal|spirulina|celery|zinc|b12|deficien|diagnos|chronic|fibromyalgia|lyme|candida|eczema|psoriasis|shingles|streptococ|nervous.?system|fatigue|brain.?fog|joint|inflam|heal|treatment|cause|why.*(feel|tired|pain|sick)|what.*(wrong|causing|help)/i

// Smart routing — picks Opus or Sonnet based on actual message content.
// Short follow-ups and simple questions use Sonnet (~5x cheaper).
// Complex health queries, symptoms, and protocols always use Opus.
function resolveModel(tier, messages = []) {
  if (tier === 'quick') return MODELS.quick
  if (tier === 'deep')  return MODELS.deep

  // Analyse the last user message for complexity signals
  const lastUser = [...messages].reverse().find(m => m.role === 'user')
  const text = typeof lastUser?.content === 'string'
    ? lastUser.content
    : (lastUser?.content?.find?.(b => b.type === 'text')?.text ?? '')
  const words = text.trim().split(/\s+/).length

  // Very short messages are always conversational follow-ups → Sonnet
  if (words <= 12) return MODELS.quick

  // Any health/healing terminology → Opus regardless of length
  if (OPUS_SIGNALS.test(text)) return MODELS.standard

  // Medium questions with no medical content → Sonnet
  if (words <= 40) return MODELS.quick

  // Long questions default to Opus
  return MODELS.standard
}

router.post('/', async (req, res) => {
  const { system, messages, maxTokens = 900, tier = 'standard' } = req.body
  if (!messages?.length) return res.status(400).json({ error: 'messages required' })

  try {
    const model = resolveModel(tier, messages)
    console.log(`🤖 [${tier}] → ${model.split('-').slice(1,3).join('-')} (${messages[messages.length-1]?.content?.slice?.(0,60) ?? ''}…)`)
    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      messages,
      ...(system ? { system } : {}),
    })
    res.json({ text: response.content.find(b => b.type === 'text')?.text ?? '' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/stream', async (req, res) => {
  const { system, messages, maxTokens = 900, tier = 'standard' } = req.body
  if (!messages?.length) return res.status(400).json({ error: 'messages required' })

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  try {
    const model = resolveModel(tier, messages)
    console.log(`🤖 [stream/${tier}] → ${model.split('-').slice(1,3).join('-')}`)
    const stream = anthropic.messages.stream({
      model,
      max_tokens: maxTokens,
      messages,
      ...(system ? { system } : {}),
    })

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
