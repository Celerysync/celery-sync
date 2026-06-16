import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'

const router = Router()
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

router.post('/', async (req, res) => {
  const { system, messages, maxTokens = 900 } = req.body
  if (!messages?.length) return res.status(400).json({ error: 'messages required' })

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      messages,
      ...(system ? { system } : {}),
    })
    res.json({ text: response.content.find(b => b.type === 'text')?.text ?? '' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
