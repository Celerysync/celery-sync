import express from 'express'
import { rateLimit, ipKeyGenerator } from 'express-rate-limit'
import claudeRoutes from './routes/claude.js'
import stripeRoutes from './routes/stripe.js'
import humeRoutes from './routes/hume.js'
import notificationRoutes from './routes/notifications.js'
import wearableRoutes from './routes/wearable.js'
import analyticsRoutes from './routes/analytics.js'
import memoryRoutes from './routes/memory.js'
import carerRoutes from './routes/carers.js'
import encouragementRoutes from './routes/encouragement.js'
import communityRoutes from './routes/community.js'
import accountRoutes from './routes/account.js'
import { signedInOwner, except, guardPathIds } from './auth.js'

// Every /api route, with who may call it. The login check runs before the
// rate limiter so limits are counted per signed-in person (server/index.js). Kept apart from index.js (which
// also starts the cron jobs) so the exact same setup can be mounted in tests.
//
// Open on purpose: the Stripe webhook (Stripe's signature is its check), the
// Apple Shortcut ingest (its own per-user secret token), the anonymous
// community count, and the health check. Everything else needs a login, and
// any userId / profileId it sends must be the signed-in user's own.
// Rate limiting — protect AI endpoints from abuse / runaway costs.
//
// Limits are PER PERSON. Every request reaches this server through the same
// proxies (Vercel's rewrite, then Railway's edge), so the connection address
// is the proxy's, not the user's — keyed on that, all users shared one bucket
// and ~10 people at once would have hit "Too many requests". Signed-in
// requests (the auth check runs first, below) are keyed on the user id; open
// routes on the visitor's own address, the first entry of X-Forwarded-For.
const clientAddress = (req) =>
  String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip
const perPerson = (req) => (req.user?.id ? `user:${req.user.id}` : `ip:${ipKeyGenerator(clientAddress(req))}`)
const limiter = (max, error, keyGenerator = perPerson) => rateLimit({
  windowMs: 60 * 1000,
  max,
  keyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  // We read X-Forwarded-For ourselves (above) instead of trusting every proxy hop.
  validate: { xForwardedForHeader: false },
  message: { error },
})

export function mountApi(app, {
  aiLimit = limiter(20, 'Too many requests — please wait a moment before trying again.'), // AI calls / person / min
  generalLimit = limiter(90, 'Too many requests — please slow down.'),                    // everything else / person / min
  // Generous per-address cap in front of everything, so floods of fake logins
  // (each checked against Supabase) are throttled before the login check.
  floodLimit = limiter(300, 'Too many requests — please slow down.', (req) => `ip:${ipKeyGenerator(clientAddress(req))}`),
} = {}) {
  app.use('/api', floodLimit)
  // Stripe webhook needs raw body — must be registered before express.json()
  app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }))
  app.use(express.json({ limit: '50mb' }))

  const auth = signedInOwner()
  for (const r of [accountRoutes, claudeRoutes, humeRoutes, stripeRoutes, notificationRoutes, wearableRoutes, analyticsRoutes, memoryRoutes, carerRoutes, encouragementRoutes]) guardPathIds(r)
  app.use('/api/claude', auth, aiLimit, claudeRoutes)
  app.use('/api/hume', auth, generalLimit, humeRoutes)
  app.use('/api/stripe', except(['/webhook'], auth), except(['/webhook'], generalLimit), stripeRoutes)
  app.use('/api/notifications', auth, generalLimit, notificationRoutes)
  app.use('/api/wearable', except(['/shortcut/ingest'], auth), generalLimit, wearableRoutes)
  // Usage events can come from the landing page before sign-in; unsigned
  // ones are stored with no user attached.
  const optionalAuth = signedInOwner({ optional: true })
  app.use('/api/analytics', (req, res, next) => (req.path === '/event' ? optionalAuth : auth)(req, res, next), generalLimit, analyticsRoutes)
  app.use('/api/memory', auth, generalLimit, memoryRoutes)
  app.use('/api/carers', auth, generalLimit, carerRoutes)
  app.use('/api/encouragement', auth, generalLimit, encouragementRoutes)
  app.use('/api/account', auth, generalLimit, accountRoutes)
  app.use('/api/community', generalLimit, communityRoutes)

  app.get('/api/health', (_req, res) => res.json({ ok: true }))
}
