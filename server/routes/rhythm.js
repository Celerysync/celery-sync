import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

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

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

// Hourly tick — sends a push for any rhythm item with a fixed_time whose
// hour matches the subscriber's current local hour. Dedup via
// last_reminded_on (compared against today's date) means this naturally
// resets each new day without a separate reset job, same pattern as the
// restock alert's low_stock_alerted_on.
export async function sendRhythmReminders() {
  const { data: subs } = await supabaseAdmin.from('push_subscriptions').select('user_id, endpoint, keys, timezone')
  if (!subs?.length) return

  const today = todayStr()
  let sent = 0

  for (const sub of subs) {
    try {
      const tz = sub.timezone || 'UTC'
      const localHour = parseInt(
        new Date().toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', hour12: false }),
        10
      )

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('user_id', sub.user_id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (!profile?.id) continue

      const { data: items } = await supabaseAdmin
        .from('rhythm_items')
        .select('*')
        .eq('profile_id', profile.id)
        .not('fixed_time', 'is', null)
      if (!items?.length) continue

      const weekday = new Date().toLocaleDateString('en-US', { timeZone: tz, weekday: 'short' })
      const isWeekend = weekday === 'Sat' || weekday === 'Sun'

      for (const item of items) {
        const itemHour = parseInt(item.fixed_time.split(':')[0], 10)
        if (itemHour !== localHour) continue
        if (item.last_reminded_on === today) continue
        if (item.frequency === 'weekdays' && isWeekend) continue

        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          JSON.stringify({
            title: `${item.emoji || '🌿'} ${item.name}`,
            body: item.note ? `Time for ${item.name} — ${item.note}` : `Time for ${item.name}`,
            tag: `rhythm-${item.id}`,
          })
        ).catch(async (err) => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
          }
        })

        await supabaseAdmin.from('rhythm_items').update({ last_reminded_on: today }).eq('id', item.id)
        sent++
      }
    } catch (err) {
      console.warn(`Rhythm reminder failed for subscription ${sub.endpoint?.slice(-12)}:`, err.message)
    }
  }

  if (sent > 0) console.log(`🕐 Rhythm item reminders sent: ${sent}`)
}
