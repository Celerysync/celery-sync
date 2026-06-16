import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import claudeRoutes from './routes/claude.js'
import stripeRoutes from './routes/stripe.js'
import elevenLabsRoutes from './routes/elevenlabs.js'
import booksRoutes from './routes/books.js'

const app = express()
const PORT = process.env.PORT || 3001
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'

app.use(cors({ origin: CLIENT_URL }))

// Stripe webhook needs raw body — must be registered before express.json()
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }))

app.use(express.json({ limit: '50mb' }))

app.use('/api/claude', claudeRoutes)
app.use('/api/stripe', stripeRoutes)
app.use('/api/elevenlabs', elevenLabsRoutes)
app.use('/api/books', booksRoutes)

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.listen(PORT, () => console.log(`🌿 CelerySync API running on :${PORT}`))
