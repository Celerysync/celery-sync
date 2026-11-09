// "Your month" by email: on the 1st of each month, in the morning in each
// person's own time zone, a short summary of what they kept up last month —
// the same words as Progress → Your month. Only to people who logged
// something that month, once per profile per month, and anyone can turn it
// off with one tap (link in the email) or in Settings → Reminders.
//
// Descriptive only: their own records, never what anything did for them.
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { Router } from 'express'
import { buildMonthSummary, monthSentences } from '../../src/lib/monthSummary.js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const PLACEHOLDER_NAME = 'Me'
const DEFAULT_TZ = 'Australia/Sydney'
const SITE = 'https://celerysync.com'
const API = process.env.PUBLIC_API_URL || 'https://celery-sync-production.up.railway.app'

const pad = (n) => String(n).padStart(2, '0')

// Their local date and hour in a time zone.
export function localParts(tz, now = new Date()) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
  const p = Object.fromEntries(f.formatToParts(now).map((x) => [x.type, x.value]))
  return { year: Number(p.year), month: Number(p.month), day: Number(p.day), hour: Number(p.hour) }
}

// The month that just ended, for someone whose local date is the 1st.
export function lastMonthRange({ year, month }) {
  const y = month === 1 ? year - 1 : year
  const m = month === 1 ? 12 : month - 1
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const label = new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString('en-AU', { month: 'long', timeZone: 'UTC' })
  return { start: `${y}-${pad(m)}-01`, end: `${y}-${pad(m)}-${pad(days)}`, label, year: y, days, sofar: false, key: `${y}-${pad(m)}` }
}

// Due: it's the 1st, between 8am and noon where they are, they haven't
// turned it off, and this profile hasn't had this month's email yet.
export function monthlyEmailDue({ user, profileId, tz, now = new Date() }) {
  if (!user?.email || user.user_metadata?.monthly_email_off) return null
  const local = localParts(tz || DEFAULT_TZ, now)
  if (local.day !== 1 || local.hour < 8 || local.hour >= 12) return null
  const range = lastMonthRange(local)
  if (user.user_metadata?.monthly_sent?.[profileId] === range.key) return null
  return range
}

export function offLinkFor(userId) {
  const secret = process.env.EMAIL_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'dev'
  const sig = crypto.createHmac('sha256', secret).update(`monthly-off:${userId}`).digest('hex').slice(0, 32)
  return `${API}/api/email/monthly-off?u=${encodeURIComponent(userId)}&s=${sig}`
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

export function monthlyEmailContent({ summary, name, offUrl, fern = null }) {
  const lines = monthSentences(summary, name || '')
  const subject = `Your ${summary.range.label} with CelerySync 🌿`
  const tile = (value, label) => `<td style="padding:6px;width:33%"><div style="background:#eef5ec;border-radius:12px;padding:12px 6px;text-align:center">
      <div style="font-size:24px;font-weight:700;color:#3D6B44">${value}</div><div style="font-size:13px;color:#5a6b5a">${label}</div></div></td>`
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:16px;background:#f7f9f4;font-family:Georgia,serif;color:#1e2a1e">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden">
  <div style="background:#3D6B44;padding:28px;text-align:center;color:#fff">
    <div style="font-size:36px">🌿</div>
    <h1 style="margin:6px 0 0;font-size:24px">Your ${esc(summary.range.label)}</h1>
    <p style="margin:6px 0 0;font-size:15px;opacity:.9">A look back at what you kept up</p>
  </div>
  <div style="padding:20px 22px 4px">
    <table style="width:100%;border-collapse:collapse"><tr>
      ${tile(summary.showedUpDays, summary.showedUpDays === 1 ? 'day kept up' : 'days kept up')}
      ${tile(summary.totalTicks, summary.totalTicks === 1 ? 'step ticked' : 'steps ticked')}
      ${tile(summary.checkinCount, summary.checkinCount === 1 ? 'check-in' : 'check-ins')}
    </tr></table>
  </div>
  <div style="padding:8px 26px 4px;font-size:17px;line-height:1.7">
    ${lines.map((l) => `<p style="margin:0 0 12px">${esc(l)}</p>`).join('')}
    <p style="margin:0 0 12px">Here's to ${esc(nextMonthLabel(summary.range))}. 🌿${fern ? ` ${esc(fern)}` : ''}</p>
  </div>
  <div style="padding:8px 26px 26px;text-align:center">
    <a href="${SITE}" style="display:inline-block;background:#3D6B44;color:#fff;border-radius:30px;padding:14px 30px;font-weight:700;font-size:16px;text-decoration:none">Open CelerySync</a>
  </div>
  <div style="background:#f7f9f4;padding:16px 22px;text-align:center;font-size:12px;color:#7a8a7a;line-height:1.7">
    From what you ticked and logged: just your own records, not medical advice.<br>
    CelerySync is an independent app, not affiliated with Anthony William or Medical Medium.<br>
    <a href="${offUrl}" style="color:#7a8a7a">Turn off these monthly emails</a>
  </div>
</div></body></html>`
  const text = [`Your ${summary.range.label}`, '', ...lines, '', `Open CelerySync: ${SITE}`, '', `Turn off these monthly emails: ${offUrl}`].join('\n')
  return { subject, html, text }
}

function nextMonthLabel(range) {
  const [y, m] = range.key ? range.key.split('-').map(Number) : [range.year, Number(range.start.slice(5, 7))]
  return new Date(Date.UTC(m === 12 ? y + 1 : y, m === 12 ? 0 : m, 15)).toLocaleDateString('en-AU', { month: 'long', timeZone: 'UTC' })
}

async function loadMonth(profileId, range) {
  const status = []
  for (let from = 0; from < 6000; from += 1000) {
    const { data, error } = await supabaseAdmin.from('v_daily_status')
      .select('item_id, item_name, item_category, local_date, status, occurrence_slot')
      .eq('profile_id', profileId).gte('local_date', range.start).lte('local_date', range.end)
      .order('local_date').range(from, from + 999)
    if (error) throw new Error(error.message)
    status.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  const cols = 'item_id, occurrence_slot, local_date, event_type, recipe_name, occurred_at'
  const [ticks, undos, checkins, programs] = await Promise.all([
    supabaseAdmin.from('activity_events').select(cols).eq('profile_id', profileId).gte('local_date', range.start).lte('local_date', range.end).not('recipe_name', 'is', null).limit(5000),
    supabaseAdmin.from('activity_events').select(cols).eq('profile_id', profileId).gte('local_date', range.start).lte('local_date', range.end).eq('event_type', 'uncompleted').limit(5000),
    supabaseAdmin.from('daily_checkins').select('check_date, energy').eq('profile_id', profileId).gte('check_date', range.start).lte('check_date', range.end),
    supabaseAdmin.from('active_protocols').select('program_name, end_date, completed').eq('profile_id', profileId).gte('end_date', range.start).lte('end_date', range.end),
  ])
  return buildMonthSummary({
    range, statusRows: status,
    events: [...(ticks.data || []), ...(undos.data || [])],
    checkins: checkins.data || [], programs: programs.data || [],
  })
}

async function allUsers() {
  const users = []
  for (let page = 1; ; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    users.push(...(data?.users || []))
    if (!data?.users || data.users.length < 1000) return users
  }
}

// Runs hourly; each person is due once, on the 1st, in their own morning.
export async function sendMonthlySummaries(now = new Date()) {
  if (!process.env.RESEND_API_KEY) return 0
  const resend = new Resend(process.env.RESEND_API_KEY)
  let sent = 0
  for (const user of await allUsers()) {
    if (!user.email || user.user_metadata?.monthly_email_off) continue
    const { data: sub } = await supabaseAdmin.from('push_subscriptions').select('timezone').eq('user_id', user.id).limit(1).maybeSingle()
    const tz = sub?.timezone || DEFAULT_TZ
    const { data: profiles } = await supabaseAdmin.from('profiles').select('id, name').eq('user_id', user.id)
    const { data: prefs } = await supabaseAdmin.from('user_voice_prefs').select('companion_name').eq('user_id', user.id).maybeSingle()
    for (const profile of profiles || []) {
      const range = monthlyEmailDue({ user, profileId: profile.id, tz, now })
      if (!range) continue
      try {
        const summary = await loadMonth(profile.id, range)
        // Mark first, so a failure part-way never sends twice.
        const monthly_sent = { ...(user.user_metadata?.monthly_sent || {}), [profile.id]: range.key }
        await supabaseAdmin.auth.admin.updateUserById(user.id, { user_metadata: { ...user.user_metadata, monthly_sent } })
        user.user_metadata = { ...user.user_metadata, monthly_sent }
        if (summary.empty) continue // nothing logged: no email
        const name = profile.name && profile.name !== PLACEHOLDER_NAME ? profile.name : ''
        const { subject, html, text } = monthlyEmailContent({ summary, name, offUrl: offLinkFor(user.id), fern: prefs?.companion_name || null })
        const { error } = await resend.emails.send({ from: 'CelerySync <healing@celerysync.com>', to: user.email, subject, html, text })
        if (error) throw new Error(error.message)
        sent++
      } catch (err) {
        console.warn(`Monthly email failed for ${profile.id}:`, err.message)
      }
    }
  }
  if (sent) console.log(`📅 Monthly summaries emailed: ${sent}`)
  return sent
}

// One-tap "turn these off" from the email (no sign-in needed; the link is
// signed for that person only).
export const monthlyEmailRoutes = Router()
monthlyEmailRoutes.get('/monthly-off', async (req, res) => {
  const { u, s } = req.query
  const expected = String(offLinkFor(String(u || ''))).split('&s=')[1]
  const ok = u && s && expected && s.length === expected.length && crypto.timingSafeEqual(Buffer.from(String(s)), Buffer.from(expected))
  const page = (msg) => `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CelerySync</title></head>
<body style="font-family:Georgia,serif;background:#f7f9f4;color:#1e2a1e;padding:40px 20px;text-align:center"><div style="max-width:420px;margin:0 auto;background:#fff;border-radius:16px;padding:28px">
<div style="font-size:36px">🌿</div><p style="font-size:18px;line-height:1.6">${msg}</p>
<p><a href="${SITE}" style="color:#3D6B44;font-weight:700">Open CelerySync</a></p></div></body></html>`
  if (!ok) return res.status(400).send(page("That link didn't work. You can turn monthly emails off in the app: Settings → Reminders."))
  try {
    const { data } = await supabaseAdmin.auth.admin.getUserById(String(u))
    if (!data?.user) return res.status(404).send(page('We couldn\'t find that account.'))
    await supabaseAdmin.auth.admin.updateUserById(String(u), { user_metadata: { ...data.user.user_metadata, monthly_email_off: true } })
    res.send(page("Done. You won't get the monthly email any more. You can turn it back on any time in Settings → Reminders."))
  } catch {
    res.status(500).send(page('Something went wrong. Please try again, or turn it off in the app: Settings → Reminders.'))
  }
})
