import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'
import { MODELS } from './claude.js'
import { addDays, localDateInZone, rhythmRowToItem, filterTodaysItems, orderForDay } from '../../src/lib/rhythmSchedule.js'

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

// "Check-in moments": short notes through the day, written at send time from
// the person's OWN day — what's done, what's next, a program day, tonight's
// planned meal, their own snacks. Tapping one opens their AI helper with quick
// buttons (src/components/CheckInHelp.jsx). Food is only ever mentioned from
// their own steps, recipes and plan: the app has no food list of its own
// (CLAUDE.md compliance rails; LEGAL_CONSTRAINTS.md).
const STATIC_RULES = `You write one short, warm push notification for CelerySync, an app that helps
people keep up their own self-chosen daily wellness routine. It's a gentle check-in from their AI
helper at a set time of day, written from what is actually on THEIR list today.

HARD RULES — NON-NEGOTIABLE:
1. Supportive wellness language only. Never diagnose, treat, cure, heal or prevent anything. Never
   name or imply a medical condition. Never mention any medication. Never give medical advice.
2. No guilt or shame, ever. Steps not done yet are simply "still ahead" or "whenever you're ready" —
   never "missed", "forgot", "overdue", "should have".
3. FOOD: only ever mention a food, drink, snack or meal by a name that appears in THEIR OWN lists
   below (their steps, their snacks, their planned meals). If none fits, mention no food at all.
   Never suggest, invent or combine foods, amounts or recipes of your own. Never name any author,
   book, brand or person.
4. Never say the routine, a program, the app or anything they do is "working", "healing" or causing
   any change. Describe only what's on their list or what they've logged.
5. Write it like a kind friend checking in: what's next if it helps (by their own step name and
   time), and end with a soft offer of help or a gentle question ("How are you going?", "Need a
   hand?", "I'm here if you need me."). If they're in a program, you may mention the day.
6. HARD LIMIT: 140 characters including spaces. One or two short sentences. At most one emoji.
7. Return ONLY the message text. No quotes, no JSON, nothing else.`

export const CHECKIN_WINDOWS = {
  morning: { label: 'morning', tone: 'a soft start to the day' },
  midday: { label: 'midday', tone: 'a light middle-of-the-day check-in' },
  afternoon: { label: 'afternoon', tone: 'a gentle afternoon check-in (energy dips are common; no pressure)' },
  evening: { label: 'evening', tone: 'calm and reflective, winding down; never a task list' },
}
export const DEFAULT_PREFS = {
  morning: { enabled: false, hour: 10 },
  midday: { enabled: false, hour: 12 },
  afternoon: { enabled: true, hour: 15 },
  evening: { enabled: true, hour: 20 },
}

// Safety net — never ship a notification over the limit.
const MAX_MESSAGE_LENGTH = 140
export function enforceLength(message) {
  if (!message || message.length <= MAX_MESSAGE_LENGTH) return message
  const cut = message.slice(0, MAX_MESSAGE_LENGTH)
  const lastSentenceEnd = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '))
  if (lastSentenceEnd > 0) return cut.slice(0, lastSentenceEnd + 1).trim()
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim()
}

const fmt = (hhmm) => {
  if (!hhmm) return ''
  const [h, m] = String(hhmm).split(':').map(Number)
  return `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, '0')}` : ''}${h < 12 ? 'am' : 'pm'}`
}

export function buildDynamicPrompt(ctx, win) {
  const steps = ctx.steps.length
    ? ctx.steps.map((s) => `- ${s.done ? 'done' : 'still ahead'}: ${s.name}${s.time ? ` (${fmt(s.time)})` : ''}`).join('\n')
    : '- nothing on their list today'
  return `Time of day: ${CHECKIN_WINDOWS[win]?.label || win} (${ctx.localTime}). Tone: ${CHECKIN_WINDOWS[win]?.tone || 'gentle'}.
Their name: ${ctx.name || 'not given'}
Their helper's name: ${ctx.helperName || 'none (just say "your helper" or nothing)'}
Program: ${ctx.program ? `${ctx.program.name}, day ${ctx.program.day} of ${ctx.program.total}` : 'none running'}
Today's list (their own steps, in order):
${steps}
Their own snacks (from their steps and Kitchen): ${ctx.snacks.length ? ctx.snacks.join(', ') : 'none listed'}
Their planned meals today: ${ctx.planned.length ? ctx.planned.join(', ') : 'none planned'}
Logged today: ${ctx.energyNote}
Days in a row they've ticked something: ${ctx.streakDays}

Write the one check-in message now.`
}

export async function generateCheckIn(context, win) {
  const response = await anthropic.messages.create({
    model: MODELS.quick,
    max_tokens: 120,
    system: STATIC_RULES,
    messages: [{ role: 'user', content: buildDynamicPrompt(context, win) }],
  })
  const raw = response.content.find((b) => b.type === 'text')?.text?.trim() || ''
  return enforceLength(raw.replace(/^["'“]|["'”]$/g, '').trim()) || null
}

// Their real day, in their own words: steps (done / still ahead), program
// day, planned meals, their own snacks, today's energy if logged, streak.
export async function buildContextForProfile(profileId, userId, today, tz) {
  const dow = new Date(`${today}T12:00:00Z`).getUTCDay()
  const [profileRes, rowsRes, programRes, statusRes, planRes, snackRecipesRes, checkinsRes, prefsRes] = await Promise.all([
    supabaseAdmin.from('profiles').select('name').eq('id', profileId).maybeSingle(),
    supabaseAdmin.from('rhythm_items').select('*').eq('profile_id', profileId).is('archived_at', null),
    supabaseAdmin.from('active_protocols').select('program_id, program_name, start_date, total_days, items, keep_everyday')
      .eq('profile_id', profileId).eq('completed', false).eq('abandoned', false).not('items', 'is', null)
      .order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabaseAdmin.from('v_daily_status').select('item_id, status').eq('profile_id', profileId).eq('local_date', today),
    supabaseAdmin.from('meal_plan_entries').select('slot, recipe:kitchen_items(name)').eq('profile_id', profileId).eq('plan_date', today),
    supabaseAdmin.from('kitchen_items').select('name').eq('profile_id', profileId).eq('kind', 'snack').limit(8),
    supabaseAdmin.from('daily_checkins').select('check_date, energy, rhythm_completed').eq('profile_id', profileId).order('check_date', { ascending: false }).limit(14),
    supabaseAdmin.from('user_voice_prefs').select('companion_name').eq('user_id', userId).maybeSingle(),
  ])

  const p = programRes.data
  const program = p && {
    id: p.program_id, name: p.program_name, startDate: p.start_date, totalDays: p.total_days, keepEveryday: p.keep_everyday,
    items: (p.items || []).map((it) => ({ ...it, programId: it.programId ?? p.program_id })),
  }
  const items = orderForDay(filterTodaysItems((rowsRes.data || []).map(rhythmRowToItem), program, today, dow))
  const done = new Set((statusRes.data || []).filter((r) => r.status === 'completed').map((r) => r.item_id))
  const steps = items.slice(0, 14).map((i) => ({ name: i.name, time: i.fixedTime ? String(i.fixedTime).slice(0, 5) : null, done: done.has(i.id) }))

  let programInfo = null
  if (program?.startDate) {
    const day = Math.floor((new Date(`${today}T00:00:00Z`) - new Date(`${program.startDate}T00:00:00Z`)) / 86_400_000) + 1
    if (day >= 1 && (!program.totalDays || day <= program.totalDays)) programInfo = { name: program.name, day, total: program.totalDays }
  }

  const snackSteps = items.filter((i) => /snack/i.test(i.name)).map((i) => i.name)
  const snacks = [...new Set([...snackSteps, ...(snackRecipesRes.data || []).map((r) => r.name)])].slice(0, 8)
  const planned = (planRes.data || []).filter((e) => e.recipe?.name).map((e) => `${e.slot}: ${e.recipe.name}`)

  const checkins = checkinsRes.data || []
  const todays = checkins.find((c) => c.check_date === today)
  const energyNote = todays?.energy ? `energy ${todays.energy} out of 10` : 'no check-in yet today'
  const active = new Set(checkins.filter((c) => (c.rhythm_completed || 0) > 0).map((c) => c.check_date))
  let streakDays = 0
  for (let d = active.has(today) ? today : addDays(today, -1); active.has(d); d = addDays(d, -1)) streakDays++

  const localTime = new Date().toLocaleTimeString('en-AU', { timeZone: tz, hour: 'numeric', minute: '2-digit' })
  const name = profileRes.data?.name && profileRes.data.name !== 'Me' ? profileRes.data.name : null
  return { name, helperName: prefsRes.data?.companion_name || null, program: programInfo, steps, snacks, planned, energyNote, streakDays, localTime }
}

async function primaryProfileFor(userId) {
  const { data } = await supabaseAdmin
    .from('profiles').select('id').eq('user_id', userId)
    .order('created_at', { ascending: true }).limit(1).maybeSingle()
  return data?.id || null
}

// Which check-in is due this hour, if any.
export function dueWindow(prefs, localHour) {
  const merged = { ...DEFAULT_PREFS, ...(prefs || {}) }
  return Object.keys(CHECKIN_WINDOWS).find((w) => merged[w]?.enabled && Number(merged[w].hour) === localHour) || null
}

// Hourly. For each person with notifications on: if one of their check-in
// times is this hour, claim it (one row per profile, day and time — so two
// phones never get two), write it from their day right now, and send it.
export async function runEncouragementTick() {
  const { data: subs } = await supabaseAdmin.from('push_subscriptions').select('*')
  if (!subs?.length) return

  for (const sub of subs) {
    try {
      const tz = sub.timezone || 'UTC'
      const today = localDateInZone(tz)
      const localHour = parseInt(new Date().toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', hour12: false }), 10) % 24
      const win = dueWindow(sub.encouragement_prefs, localHour)
      if (!win) continue
      const profileId = await primaryProfileFor(sub.user_id)
      if (!profileId) continue

      // Claim this check-in first. Another phone (or a re-run) finds it taken.
      const { data: claimed, error: claimError } = await supabaseAdmin.from('encouragement_messages')
        .insert({ profile_id: profileId, date: today, time_window: win, message: '…', sent: false })
        .select('id').maybeSingle()
      if (claimError || !claimed) {
        if (claimError && claimError.code !== '23505') console.warn(`Check-in ${win} not available yet:`, claimError.message)
        continue
      }

      const context = await buildContextForProfile(profileId, sub.user_id, today, tz)
      const message = await generateCheckIn(context, win)
      if (!message) continue
      await supabaseAdmin.from('encouragement_messages').update({ message }).eq('id', claimed.id)

      const { data: devices } = await supabaseAdmin.from('push_subscriptions').select('endpoint, keys').eq('user_id', sub.user_id)
      for (const d of devices || [{ endpoint: sub.endpoint, keys: sub.keys }]) {
        await webpush.sendNotification(
          { endpoint: d.endpoint, keys: d.keys },
          JSON.stringify({ title: context.helperName ? `🌿 ${context.helperName}` : '🌿 CelerySync', body: message, tag: `checkin-${win}`, url: `/?checkin=${win}` })
        ).catch(async (err) => {
          if (err.statusCode === 410 || err.statusCode === 404) await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', d.endpoint)
        })
      }
      await supabaseAdmin.from('encouragement_messages').update({ sent: true }).eq('id', claimed.id)
      console.log(`💬 Sent ${win} check-in to profile ${profileId}`)
    } catch (err) {
      console.warn(`Check-in tick error for subscription ${sub.id}:`, err.message)
    }
  }
}

// Read current check-in times for a user (falls back to defaults if unset)
router.get('/preferences', async (req, res) => {
  const { userId } = req.query
  if (!userId) return res.status(400).json({ error: 'Missing userId' })
  const { data } = await supabaseAdmin
    .from('push_subscriptions').select('encouragement_prefs').eq('user_id', userId).limit(1).maybeSingle()
  res.json({ encouragementPrefs: { ...DEFAULT_PREFS, ...(data?.encouragement_prefs || {}) } })
})

// Update check-in times (enabled + hour per time of day) for one user
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
