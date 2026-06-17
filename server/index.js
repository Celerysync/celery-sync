import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cron from 'node-cron'
import claudeRoutes from './routes/claude.js'
import stripeRoutes from './routes/stripe.js'
import elevenLabsRoutes from './routes/elevenlabs.js'
import booksRoutes from './routes/books.js'
import notificationRoutes, { sendToUsersAtLocalHour } from './routes/notifications.js'
import wearableRoutes, { syncAllOuraUsers } from './routes/wearable.js'

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
app.use('/api/notifications', notificationRoutes)
app.use('/api/wearable', wearableRoutes)

app.get('/api/health', (_req, res) => res.json({ ok: true }))

// ─── Healing Protocol Push Notification Schedule ───────────────────────────
const PUSH_SCHEDULE = [
  { hour: 6,  title: "🍋 Good morning, healer!",       body: "Time for your lemon water — 16–32oz on an empty stomach. Your healing day starts now.",           tag: "morning-lemon"  },
  { hour: 7,  title: "🥬 Celery juice time!",           body: "It's been 30+ minutes since lemon water. Fresh celery juice now — 16oz pure, nothing added.",     tag: "morning-celery" },
  { hour: 8,  title: "🫐 Heavy Metal Detox Smoothie",  body: "Round out your morning protocol with your HMDS. Wild blueberries, banana, spirulina + the Big 5.", tag: "morning-hmds"   },
  { hour: 10, title: "🍎 Adrenal snack time",           body: "Stabilise your blood sugar — apple + celery, banana + dates, or coconut water + banana.",          tag: "snack-10"       },
  { hour: 12, title: "🌿 Midday snack reminder",        body: "Your adrenals need support every 2 hours. Apple + dates, or banana + Medjool dates.",              tag: "snack-12"       },
  { hour: 14, title: "🍊 Afternoon adrenal support",    body: "Don't let your blood sugar drop — Anthony William says this is the most healing time of day.",     tag: "snack-14"       },
  { hour: 16, title: "🌿 Late afternoon snack",         body: "One more adrenal snack before dinner. Keep those glucose reserves stable for healing.",             tag: "snack-16"       },
  { hour: 19, title: "🌙 Evening wind-down",            body: "Dinner should be light and early. Let your liver do its deep cleansing work from 1–3am.",          tag: "evening"        },
];

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  // Run at the top of every hour — check which users are at a scheduled local hour
  cron.schedule('0 * * * *', async () => {
    for (const s of PUSH_SCHEDULE) {
      try {
        await sendToUsersAtLocalHour({ hour: s.hour, title: s.title, body: s.body, tag: s.tag, url: '/' });
      } catch (err) {
        console.warn('Push schedule error:', err.message);
      }
    }
  });
  console.log('🔔 Push notification scheduler active')

  // Sync Oura Ring data for all connected users at 6am local time
  cron.schedule('30 6 * * *', async () => {
    try { await syncAllOuraUsers(); } catch (err) { console.warn('Oura cron error:', err.message); }
  });;
}

app.listen(PORT, () => console.log(`🌿 CelerySync API running on :${PORT}`))
