import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cron from 'node-cron'
import { mountApi } from './api.js'
import { syncAllOuraUsers } from './routes/wearable.js'
import { generateWeeklyDigest, checkTrialUserAlert } from './routes/analytics.js'
import { generateAllWeeklySummaries, generateAnniversaryLetters, refreshAllHealingProfiles } from './routes/memory.js'
import { runEncouragementTick } from './routes/encouragement.js'
import { sendRhythmReminders } from './routes/rhythm.js'
import { checkRestockAlerts } from './routes/supplements.js'
import { purgeOldVoiceTurns } from './routes/hume.js'
import { sendTrialEndingEmails } from './routes/trialEmails.js'

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

mountApi(app)

// ─── Scheduled push notifications ──────────────────────────────────────────
// There is deliberately NO app-defined protocol schedule here. Scheduled
// reminders come from the user's OWN rhythm items (sendRhythmReminders, one
// push per item that carries its own time), never from a routine the app
// invented. See CLAUDE.md compliance rails + LEGAL_CONSTRAINTS.md.
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  // Run at the top of every hour — each sender decides who is due.
  cron.schedule('0 * * * *', async () => {
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
  });
  // Rhythm reminders every 5 minutes, so "30 minutes after" lands on time and a
  // 7:30 step isn't reminded at 7:00.
  cron.schedule('*/5 * * * *', async () => {
    try {
      await sendRhythmReminders();
    } catch (err) {
      console.warn('Rhythm reminder error:', err.message);
    }
  });
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

// Trial ending in 2 days: one friendly email. 11pm UTC = 9-10am in Australia.
cron.schedule('0 23 * * *', async () => {
  try { await sendTrialEndingEmails() } catch (err) { console.warn('Trial reminder error:', err.message) }
})

// Privacy: voice transcript log older than 90 days is deleted nightly (3am UTC).
// Outside the push-notification block on purpose — it must run regardless.
cron.schedule('0 3 * * *', async () => {
  try {
    const n = await purgeOldVoiceTurns()
    console.log(`🧹 Deleted ${n} voice log entries older than 90 days`)
  } catch (err) { console.warn('Voice log purge error:', err.message) }
})

app.listen(PORT, () => console.log(`🌿 CelerySync API running on :${PORT}`))
