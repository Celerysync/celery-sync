import express from 'express'
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

// Every /api route, with who may call it. Kept apart from index.js (which
// also starts the cron jobs) so the exact same setup can be mounted in tests.
//
// Open on purpose: the Stripe webhook (Stripe's signature is its check), the
// Apple Shortcut ingest (its own per-user secret token), the anonymous
// community count, and the health check. Everything else needs a login, and
// any userId / profileId it sends must be the signed-in user's own.
export function mountApi(app, { aiLimit, generalLimit }) {
  // Stripe webhook needs raw body — must be registered before express.json()
  app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }))
  app.use(express.json({ limit: '50mb' }))

  const auth = signedInOwner()
  for (const r of [accountRoutes, claudeRoutes, humeRoutes, stripeRoutes, notificationRoutes, wearableRoutes, analyticsRoutes, memoryRoutes, carerRoutes, encouragementRoutes]) guardPathIds(r)
  app.use('/api/claude', aiLimit, auth, claudeRoutes)
  app.use('/api/hume', generalLimit, auth, humeRoutes)
  app.use('/api/stripe', generalLimit, except(['/webhook'], auth), stripeRoutes)
  app.use('/api/notifications', generalLimit, auth, notificationRoutes)
  app.use('/api/wearable', generalLimit, except(['/shortcut/ingest'], auth), wearableRoutes)
  // Usage events can come from the landing page before sign-in; unsigned
  // ones are stored with no user attached.
  const optionalAuth = signedInOwner({ optional: true })
  app.use('/api/analytics', generalLimit, (req, res, next) => (req.path === '/event' ? optionalAuth : auth)(req, res, next), analyticsRoutes)
  app.use('/api/memory', generalLimit, auth, memoryRoutes)
  app.use('/api/carers', generalLimit, auth, carerRoutes)
  app.use('/api/encouragement', generalLimit, auth, encouragementRoutes)
  app.use('/api/account', generalLimit, auth, accountRoutes)
  app.use('/api/community', generalLimit, communityRoutes)

  app.get('/api/health', (_req, res) => res.json({ ok: true }))
}
