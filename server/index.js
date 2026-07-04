import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cron from 'node-cron'
import { rateLimit } from 'express-rate-limit'
import claudeRoutes from './routes/claude.js'
import stripeRoutes from './routes/stripe.js'
import elevenLabsRoutes from './routes/elevenlabs.js'
import notificationRoutes, { sendToUsersAtLocalHour } from './routes/notifications.js'
import wearableRoutes, { syncAllOuraUsers } from './routes/wearable.js'
import analyticsRoutes, { generateWeeklyDigest, checkTrialUserAlert } from './routes/analytics.js'
import memoryRoutes, { generateAllWeeklySummaries, generateAnniversaryLetters, refreshAllHealingProfiles } from './routes/memory.js'
import carerRoutes from './routes/carers.js'
import encouragementRoutes, { runEncouragementTick } from './routes/encouragement.js'
import { sendRhythmReminders } from './routes/rhythm.js'
import { checkRestockAlerts } from './routes/supplements.js'

const app = express()
const PORT = process.env.PORT || 3001

const ALLOWED_ORIGINS = [
  process.env.CLIENT_URL,
  'https://celerysync.vercel.app',
  'https://celery-sync.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean)

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true)
    cb(new Error('Not allowed by CORS'))
  },
  credentials: true,
}))

// Rate limiting — protect AI endpoints from abuse / runaway costs
const aiLimit = rateLimit({
  windowMs: 60 * 1000,       // 1 minute window
  max: 20,                   // 20 AI requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please wait a moment before trying again.' },
})

const ttsLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,                   // TTS is expensive — 10 per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many voice requests — please wait a moment.' },
})

const generalLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 60,                   // 60 general API calls per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please slow down.' },
})

// Stripe webhook needs raw body — must be registered before express.json()
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }))

app.use(express.json({ limit: '50mb' }))

app.use('/api/claude', aiLimit, claudeRoutes)
app.use('/api/elevenlabs', ttsLimit, elevenLabsRoutes)
app.use('/api/stripe', generalLimit, stripeRoutes)
app.use('/api/notifications', generalLimit, notificationRoutes)
app.use('/api/wearable', generalLimit, wearableRoutes)
app.use('/api/analytics', generalLimit, analyticsRoutes)
app.use('/api/memory', generalLimit, memoryRoutes)
app.use('/api/carers', generalLimit, carerRoutes)
app.use('/api/encouragement', generalLimit, encouragementRoutes)

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
    try {
      await runEncouragementTick();
    } catch (err) {
      console.warn('Encouragement tick error:', err.message);
    }
    try {
      await checkRestockAlerts();
    } catch (err) {
      console.warn('Restock check error:', err.message);
    }
    try {
      await sendRhythmReminders();
    } catch (err) {
      console.warn('Rhythm reminder error:', err.message);
    }
  });
  console.log('🔔 Push notification scheduler active')
  console.log('💬 Encouragement engine scheduler active')
  console.log('📦 Supplement restock scheduler active')
  console.log('🕐 Rhythm item reminder scheduler active')

  // Sync Oura Ring data for all connected users at 6:30am
  cron.schedule('30 6 * * *', async () => {
    try { await syncAllOuraUsers(); } catch (err) { console.warn('Oura cron error:', err.message); }
  });

  // Weekly analytics digest — every Monday at 7am UTC
  cron.schedule('0 7 * * 1', async () => {
    try { await generateWeeklyDigest(); } catch (err) { console.warn('Weekly digest error:', err.message); }
  });

  // Weekly healing summaries — every Sunday at 10pm UTC (8am Monday AEST)
  cron.schedule('0 22 * * 0', async () => {
    try { await generateAllWeeklySummaries(); } catch (err) { console.warn('Weekly summaries error:', err.message); }
  });
  console.log('📊 Weekly healing summary scheduler active')

  // Anniversary letters — daily at 9am UTC, checks for today's anniversaries
  cron.schedule('0 9 * * *', async () => {
    try { await generateAnniversaryLetters(); } catch (err) { console.warn('Anniversary letters error:', err.message); }
    try { await checkTrialUserAlert(); } catch (err) { console.warn('Trial alert error:', err.message); }
  });
  console.log('💌 Anniversary letter scheduler active')
  console.log('📱 Trial user SMS alert active (every 50 users)')

  // Nightly healing profile refresh — 2am UTC for all profiles active in the last 24h
  cron.schedule('0 2 * * *', async () => {
    try { await refreshAllHealingProfiles(); } catch (err) { console.warn('Profile refresh error:', err.message); }
  });
  console.log('🧠 Nightly healing profile refresh scheduler active')
}

app.listen(PORT, () => console.log(`🌿 CelerySync API running on :${PORT}`))
