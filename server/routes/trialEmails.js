// A friendly heads-up two days before someone's 7-day free trial ends. The
// trial lives in the app (it runs from the account's created_at; there is no
// card on file), so nothing is charged when it ends; this only stops it from
// being a surprise. Sent once per person, marked in their user_metadata.
//
// Descriptive and calm: no health claims, no pressure, and it says plainly that
// their data is safe either way.
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const TRIAL_DAYS = 7
const DAY_MS = 86_400_000
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'allij@live.com.au').toLowerCase()
const PLACEHOLDER_NAME = 'Me'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Due once the trial has between 24 and 48 hours left. The job runs daily, so
// every trial passes through that window exactly once.
export function trialEmailDue(user, now = new Date()) {
  if (!user?.email || !user.created_at) return false
  if (user.email.toLowerCase() === ADMIN_EMAIL) return false
  if (user.user_metadata?.trial_reminder_sent) return false
  const msLeft = new Date(user.created_at).getTime() + TRIAL_DAYS * DAY_MS - now.getTime()
  return msLeft > DAY_MS && msLeft <= 2 * DAY_MS
}

export function trialEmailContent({ name, endsOn }) {
  const hello = name ? `Hi ${name},` : 'Hi there,'
  const subject = 'Your CelerySync free trial ends in 2 days'
  const text = [
    hello,
    '',
    `Just a heads-up: your 7-day free trial ends on ${endsOn}.`,
    '',
    "Everything you've logged is safe either way, and Today keeps working.",
    'If you would like to keep everything else, you can choose a plan any time in Settings, under "Your plan".',
    'If not, there is nothing to do. No card was taken, so nothing will be charged.',
    '',
    'Thank you for trying CelerySync.',
    '',
    'CelerySync is an independent app, not affiliated with Anthony William or Medical Medium.',
  ].join('\n')
  const html = `<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#1e2a1e;line-height:1.6;font-size:16px">
  <p>${hello}</p>
  <p>Just a heads-up: your 7-day free trial ends on <strong>${endsOn}</strong>.</p>
  <p>Everything you've logged is safe either way, and Today keeps working.</p>
  <p>If you'd like to keep everything else, you can choose a plan any time in <strong>Settings → Your plan</strong>.
     If not, there's nothing to do. No card was taken, so nothing will be charged.</p>
  <p style="margin:24px 0"><a href="https://celerysync.com" style="background:#3D6B44;color:#fff;border-radius:30px;padding:12px 26px;text-decoration:none;font-weight:700">Open CelerySync</a></p>
  <p>Thank you for trying CelerySync.</p>
  <p style="font-size:12px;color:#6b7c6b">CelerySync is an independent app, not affiliated with Anthony William or Medical Medium.</p>
</div>`
  return { subject, text, html }
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

export async function sendTrialEndingEmails(now = new Date()) {
  if (!process.env.RESEND_API_KEY) return 0
  const resend = new Resend(process.env.RESEND_API_KEY)
  let sent = 0

  for (const user of (await allUsers()).filter((u) => trialEmailDue(u, now))) {
    try {
      const { data: sub } = await supabaseAdmin
        .from('subscriptions').select('status').eq('user_id', user.id).maybeSingle()
      if (sub && ['active', 'trialing'].includes(sub.status)) continue

      const { data: profile } = await supabaseAdmin
        .from('profiles').select('name').eq('user_id', user.id)
        .order('created_at', { ascending: true }).limit(1).maybeSingle()
      const name = profile?.name && profile.name !== PLACEHOLDER_NAME ? profile.name : null
      const endsOn = new Date(new Date(user.created_at).getTime() + TRIAL_DAYS * DAY_MS)
        .toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Australia/Sydney' })

      const { subject, text, html } = trialEmailContent({ name, endsOn })
      const { error } = await resend.emails.send({
        from: 'CelerySync <healing@celerysync.com>', to: user.email, subject, text, html,
      })
      if (error) throw new Error(error.message)

      // Mark it so a re-run never sends twice. Spread what's there: the
      // consent and terms records live in the same metadata.
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: { ...(user.user_metadata || {}), trial_reminder_sent: now.toISOString() },
      })
      sent++
    } catch (err) {
      console.warn(`Trial reminder failed for ${user.id}:`, err.message)
    }
  }
  if (sent) console.log(`⏳ Trial-ending reminders sent: ${sent}`)
  return sent
}
