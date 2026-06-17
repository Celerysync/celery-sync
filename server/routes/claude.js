import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'

const router = Router()
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Model tiers — quick tasks use Haiku (~20x cheaper), coaching uses Sonnet
const MODELS = {
  quick:    'claude-haiku-4-5-20251001',  // insights, summaries, recipes
  standard: process.env.AI_MODEL || 'claude-sonnet-4-6',  // coaching, symptoms
  deep:     'claude-sonnet-4-6',          // protocol generation, complex reasoning
}

function resolveModel(tier) {
  return MODELS[tier] || MODELS.standard
}

router.post('/', async (req, res) => {
  const { system, messages, maxTokens = 900, tier = 'standard' } = req.body
  if (!messages?.length) return res.status(400).json({ error: 'messages required' })

  try {
    const response = await anthropic.messages.create({
      model: resolveModel(tier),
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
    const stream = anthropic.messages.stream({
      model: resolveModel(tier),
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
