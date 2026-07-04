import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'
import { MODELS } from './claude.js'

const router = Router()
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:hello@celerysync.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

// Hard rules + our own generic snack-pairing bank — see LEGAL_CONSTRAINTS.md.
// Never let the model invent food pairings or reference any named author/book/brand.
const STATIC_RULES = `You write short, warm push-notification messages for CelerySync, a wellness
companion app for people following their own self-chosen daily wellness routine (juicing,
hydration, rest, gentle nutrition, journaling).

HARD RULES — NON-NEGOTIABLE:
1. Supportive wellness language ONLY. Never diagnose, treat, cure, heal, or prevent any
   condition. Never name or imply a specific medical condition.
2. Never use guilt or shame for a missed day, a broken streak, or low adherence. Always
   offer gentle re-entry — e.g. "Fresh start tonight if you're up for it" — never "you
   missed", "you forgot", "you should have", or similar.
3. For any snack or food suggestion, choose ONLY from the approved list below and describe
   it in your own words. Do NOT invent other specific food pairings, and do NOT reference
   any named health author, book, influencer, or their signature recipes/combinations.
4. Do not name any specific person, author, book, or brand anywhere in the message.
5. HARD LIMIT: 140 characters per message, including spaces and punctuation. Count before
   you answer. This is a strict limit, not a target — if your draft is longer, cut words
   until it fits. One short sentence is better than a long one that gets truncated.
6. Never give medical, diagnostic, or treatment advice, and never mention any medication.
7. Never imply the routine, protocol, streak, or app itself is "working", "healing", or
   causing any improvement. Describe only what the user has done or noticed themselves —
   never attribute their energy, mood, or symptoms to what they're following.
8. Vary the snack pairing you choose — do not default to the same one every time.
9. Plain, warm, human tone. No more than one emoji, and only if it fits naturally — most
   messages need none.

APPROVED GENERIC SNACK PAIRINGS (paraphrase freely, do not invent others):
- an apple with a spoon of nut butter
- a pear with a small handful of walnuts
- orange segments with a few almonds
- grapes with a couple of cashews
- berries with a spoonful of tahini
- melon with a small handful of pumpkin seeds
General idea you may express: pairing fruit with a little healthy fat or protein can help
keep energy steadier between meals. This is general nutrition information, not treatment
advice for any condition.

Return ONLY a JSON object with exactly two keys: {"afternoon": "...", "evening": "..."}
The afternoon message is a gentle early/mid-afternoon check-in (energy, a snack idea if it
fits naturally). The evening message is calmer and reflective — a no-pressure check-in,
never a task list.`

// Safety net — the model is instructed to stay under this, but never ship a
// notification over the limit regardless of what it returns.
const MAX_MESSAGE_LENGTH = 140

function enforceLength(message) {
  if (!message || message.length <= MAX_MESSAGE_LENGTH) return message
  const window = message.slice(0, MAX_MESSAGE_LENGTH)
  // Prefer cutting at the end of a whole sentence so we never ship a broken
  // mid-thought fragment — fall back to a word boundary only if no sentence fits.
  const lastSentenceEnd = Math.max(window.lastIndexOf('. '), window.lastIndexOf('! '), window.lastIndexOf('? '))
  if (lastSentenceEnd > 0) return window.slice(0, lastSentenceEnd + 1).trim()
  const lastSpace = window.lastIndexOf(' ')
  return (lastSpace > 0 ? window.slice(0, lastSpace) : window).trim()
}

function buildDynamicPrompt(ctx) {
  return `User context for today's two messages:
- Name: ${ctx.name || 'friend'}
- Current streak: ${ctx.streakDays > 0 ? `${ctx.streakDays} day(s) in a row` : 'no active streak right now'}
- Yesterday vs today: ${ctx.comparisonNote}
- Currently focused on: ${ctx.currentFocus || 'not specified'}
- Recent win: ${ctx.wins || 'not specified'}
- Historically hard time of day: ${ctx.hardTimes || 'not specified'}
- Active protocol: ${ctx.activeProtocolDay ? `day ${ctx.activeProtocolDay}` : 'none active'}

Write the two messages now. JSON only, no other text.`
}

// Pure — no DB access. Exported so it can be exercised directly with synthetic
// contexts (see scripts/sample-encouragement.js) before any real send is wired up.
export async function generateMessages(context) {
  const response = await anthropic.messages.create({
    model: MODELS.quick,
    max_tokens: 300,
    system: STATIC_RULES,
    messages: [{ role: 'user', content: buildDynamicPrompt(context) }],
  })
  const raw = response.content.find(b => b.type === 'text')?.text?.trim() || '{}'
  let parsed = {}
  try {
    const match = raw.match(/\{[\s\S]*\}/)
    parsed = match ? JSON.parse(match[0]) : {}
  } catch {
    parsed = {}
  }
  return {
    afternoon: enforceLength(typeof parsed.afternoon === 'string' ? parsed.afternoon.trim() : null),
    evening: enforceLength(typeof parsed.evening === 'string' ? parsed.evening.trim() : null),
  }
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

// Gathers a profile's real state — streak, day-over-day comparison, memory summary,
// active protocol day — used to ground the generated messages in this specific person.
export async function buildContextForProfile(profileId) {
  const today = todayStr()
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0]

  const [checkinsRes, profileRowRes, healingProfileRes, protocolRes] = await Promise.all([
    supabaseAdmin
      .from('daily_checkins')
      .select('check_date, energy, celery_oz')
      .eq('profile_id', profileId)
      .order('check_date', { ascending: false })
      .limit(14),
    supabaseAdmin.from('profiles').select('name').eq('id', profileId).maybeSingle(),
    supabaseAdmin.from('healing_profiles').select('current_focus, hard_times, wins').eq('profile_id', profileId).maybeSingle(),
    supabaseAdmin
      .from('active_protocols')
      .select('program_name, start_date, total_days')
      .eq('profile_id', profileId)
      .eq('completed', false)
      .eq('abandoned', false)
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const checkins = checkinsRes.data || []
  let streakDays = 0
  for (const c of checkins) {
    if ((c.celery_oz || 0) > 0) streakDays++
    else break
  }

  const todays = checkins.find(c => c.check_date === today)
  const yest = checkins.find(c => c.check_date === yesterday)
  let comparisonNote = 'no recent check-in data'
  if (todays && yest) {
    if ((todays.energy || 0) > (yest.energy || 0)) comparisonNote = `energy up from ${yest.energy} to ${todays.energy} today`
    else if ((todays.energy || 0) < (yest.energy || 0)) comparisonNote = `energy down from ${yest.energy} to ${todays.energy} today`
    else comparisonNote = `energy steady around ${todays.energy}/10`
  } else if (yest && !todays) {
    comparisonNote = 'no check-in logged yet today'
  } else if (!yest && !todays) {
    comparisonNote = 'no check-ins in the last couple of days — keep this gentle, no pressure'
  }

  let activeProtocolDay = null
  const protocol = protocolRes.data
  if (protocol?.start_date) {
    const start = new Date(protocol.start_date + 'T00:00:00')
    const now = new Date(today + 'T00:00:00')
    const diff = Math.floor((now - start) / 86_400_000) + 1
    if (diff >= 1 && (!protocol.total_days || diff <= protocol.total_days)) activeProtocolDay = diff
  }

  return {
    name: profileRowRes.data?.name || null,
    streakDays,
    comparisonNote,
    currentFocus: healingProfileRes.data?.current_focus || null,
    hardTimes: healingProfileRes.data?.hard_times || null,
    wins: healingProfileRes.data?.wins || null,
    activeProtocolDay,
  }
}

// Batch-generates today's afternoon + evening messages for every subscribed user's
// primary profile, ONE model call per profile (not per notification send).
export async function generateAllEncouragementMessages() {
  const { data: subs } = await supabaseAdmin.from('push_subscriptions').select('user_id')
  if (!subs?.length) {
    console.log('💬 No push subscribers — skipping encouragement generation')
    return
  }

  const seen = new Set()
  const userIds = subs.map(s => s.user_id).filter(id => {
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })

  const today = todayStr()
  let generated = 0

  for (const userId of userIds) {
    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (!profile?.id) continue

      const context = await buildContextForProfile(profile.id)
      const { afternoon, evening } = await generateMessages(context)

      const rows = []
      if (afternoon) rows.push({ profile_id: profile.id, date: today, window: 'afternoon', message: afternoon })
      if (evening) rows.push({ profile_id: profile.id, date: today, window: 'evening', message: evening })
      if (rows.length) {
        await supabaseAdmin.from('encouragement_messages').upsert(rows, { onConflict: 'profile_id,date,window' })
        generated += rows.length
      }
    } catch (err) {
      console.warn(`Encouragement generation failed for user ${userId}:`, err.message)
    }
  }

  console.log(`💬 Encouragement messages generated: ${generated} (for ${userIds.length} subscribers)`)
}

// Hourly tick — sends a pre-generated message when a subscriber's local time matches
// one of their enabled encouragement windows. Never calls the model at send time.
export async function sendEncouragementAtLocalHour() {
  const { data: subs } = await supabaseAdmin.from('push_subscriptions').select('*')
  if (!subs?.length) return
  const today = todayStr()

  for (const sub of subs) {
    try {
      const prefs = sub.encouragement_prefs || { afternoon: { enabled: true, hour: 15 }, evening: { enabled: true, hour: 20 } }
      const localHour = parseInt(
        new Date().toLocaleTimeString('en-US', { timeZone: sub.timezone || 'UTC', hour: 'numeric', hour12: false }),
        10
      )
      const win = prefs.afternoon?.enabled && localHour === prefs.afternoon.hour ? 'afternoon'
        : prefs.evening?.enabled && localHour === prefs.evening.hour ? 'evening'
        : null
      if (!win) continue

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('user_id', sub.user_id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (!profile?.id) continue

      const { data: msgRow } = await supabaseAdmin
        .from('encouragement_messages')
        .select('id, message, sent')
        .eq('profile_id', profile.id)
        .eq('date', today)
        .eq('window', win)
        .maybeSingle()
      if (!msgRow || msgRow.sent) continue

      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        JSON.stringify({ title: '🌿 CelerySync', body: msgRow.message, tag: `encouragement-${win}` })
      ).catch(async (err) => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        }
        throw err
      })

      await supabaseAdmin.from('encouragement_messages').update({ sent: true }).eq('id', msgRow.id)
    } catch (err) {
      console.warn('Encouragement send error:', err.message)
    }
  }
}

// Update per-window encouragement preferences (enabled + hour) for one user
router.post('/preferences', async (req, res) => {
  const { userId, encouragementPrefs } = req.body
  if (!userId || !encouragementPrefs) return res.status(400).json({ error: 'Missing data' })
  const { error } = await supabaseAdmin.from('push_subscriptions')
    .update({ encouragement_prefs: encouragementPrefs })
    .eq('user_id', userId)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

export default router
