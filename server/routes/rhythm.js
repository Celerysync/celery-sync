import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'
import { occurrencesFor, rhythmRowToItem } from '../../src/lib/rhythmSchedule.js'

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

// Hourly tick — sends a push for each scheduled occurrence of a rhythm item
// whose hour matches the subscriber's current local hour.
//
// Dedupe is per occurrence, not per day. last_reminded_on alone could only
// say "reminded today", which would swallow the second and later reminders
// of an item scheduled more than once (supplements morning and night).
// reminded_slots holds the slots already sent, and is reset whenever
// last_reminded_on rolls over to a new date — same self-resetting pattern as
// the restock alert's low_stock_alerted_on, no separate reset job.
//
// Occurrence derivation is imported from the client lib so the screen, the
// voice tools and this cron cannot disagree about what is due.
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

      // An item qualifies on either shape: the new schedule, or a legacy
      // fixed_time for rows written before the schedule column existed.
      const { data: items } = await supabaseAdmin
        .from('rhythm_items')
        .select('*')
        .eq('profile_id', profile.id)
        .or('schedule.not.is.null,fixed_time.not.is.null')
      if (!items?.length) continue

      const weekday = new Date().toLocaleDateString('en-US', { timeZone: tz, weekday: 'short' })
      const isWeekend = weekday === 'Sat' || weekday === 'Sun'

      for (const item of items) {
        if (item.frequency === 'weekdays' && isWeekend) continue

        // A new day clears the per-slot record, so slots can fire again.
        const rolledOver = item.last_reminded_on !== today
        const alreadySent = rolledOver ? [] : (Array.isArray(item.reminded_slots) ? item.reminded_slots : [])

        const due = occurrencesFor(rhythmRowToItem(item))
          .filter((occ) => occ.time && parseInt(occ.time.split(':')[0], 10) === localHour)
          // Key by the occurrence's own time; null-slot items use their time
          // so a single-occurrence item still dedupes correctly.
          .filter((occ) => !alreadySent.includes(occ.time))

        if (!due.length) continue

        for (const occ of due) {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: sub.keys },
            JSON.stringify({
              title: `${item.emoji || '🌿'} ${item.name}`,
              body: item.note ? `Time for ${item.name} — ${item.note}` : `Time for ${item.name}`,
              // Distinct per occurrence, otherwise the evening reminder would
              // silently replace the morning one still sitting in the tray.
              tag: `rhythm-${item.id}-${occ.time}`,
            })
          ).catch(async (err) => {
            if (err.statusCode === 410 || err.statusCode === 404) {
              await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
            }
          })
          sent++
        }

        await supabaseAdmin
          .from('rhythm_items')
          .update({
            last_reminded_on: today,
            reminded_slots: [...alreadySent, ...due.map((o) => o.time)],
          })
          .eq('id', item.id)
      }
    } catch (err) {
      console.warn(`Rhythm reminder failed for subscription ${sub.endpoint?.slice(-12)}:`, err.message)
    }
  }

  if (sent > 0) console.log(`🕐 Rhythm item reminders sent: ${sent}`)
}
