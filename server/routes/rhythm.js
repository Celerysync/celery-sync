import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'
import { localDateInZone, occurrenceId, rhythmRowToItem } from '../../src/lib/rhythmSchedule.js'
import { minutesInZone, planReminders } from '../../src/lib/reminderPlan.js'

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

// Runs every 5 minutes. For each person with notifications on, works out what's
// due right now in their own time zone (planReminders: set times, steps timed
// from another step being ticked, and "N minutes after the previous step"),
// including the running program's steps for today, skipping anything done or
// paused. The rules are the same ones Today uses, so the two always agree.
//
// Dedupe is per occurrence: reminded_slots holds the times already sent today
// and resets when the date rolls over (rhythm_items for everyday steps,
// active_protocols for program steps).
export async function sendRhythmReminders(now = new Date()) {
  const { data: subs } = await supabaseAdmin.from('push_subscriptions').select('user_id, endpoint, keys, timezone')
  if (!subs?.length) return

  let sent = 0

  for (const sub of subs) {
    try {
      const tz = sub.timezone || 'UTC'
      const today = localDateInZone(tz, now)
      const minutesOf = minutesInZone(tz)
      const nowMinutes = minutesOf(now)
      const dow = new Date(`${today}T12:00:00Z`).getUTCDay()

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('user_id', sub.user_id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (!profile?.id) continue

      const { data: rows } = await supabaseAdmin
        .from('rhythm_items')
        .select('*')
        .eq('profile_id', profile.id)
        .is('archived_at', null) // removed items never remind

      const { data: programRow } = await supabaseAdmin
        .from('active_protocols')
        .select('id, program_id, start_date, total_days, items, keep_everyday, reminded_on, reminded_slots')
        .eq('profile_id', profile.id)
        .eq('completed', false)
        .eq('abandoned', false)
        .not('items', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!rows?.length && !programRow) continue

      const program = programRow && {
        id: programRow.program_id,
        startDate: programRow.start_date,
        totalDays: programRow.total_days,
        keepEveryday: programRow.keep_everyday,
        items: (programRow.items || []).map((it) => ({ ...it, programId: it.programId ?? programRow.program_id })),
      }

      const { data: ticks } = await supabaseAdmin
        .from('v_daily_status')
        .select('item_id, occurrence_slot, status, occurred_at')
        .eq('profile_id', profile.id)
        .eq('local_date', today)
      const completions = {}
      for (const t of ticks || []) {
        if (t.status === 'completed') completions[occurrenceId(t.item_id, t.occurrence_slot)] = t.occurred_at
      }

      const due = planReminders({
        baseItems: (rows || []).map(rhythmRowToItem), program, completions, today, dow, nowMinutes, minutesOf,
      })
      if (!due.length) continue

      const rowById = new Map((rows || []).map((r) => [r.id, r]))
      const sentBefore = (slots, on) => (on === today && Array.isArray(slots) ? slots : [])
      const newSlots = new Map() // item id → times sent now
      let programSlots = sentBefore(programRow?.reminded_slots, programRow?.reminded_on)
      let programChanged = false

      for (const r of due) {
        const key = r.inProgram ? `${r.itemId}@${r.time}` : r.time
        const already = r.inProgram
          ? programSlots.includes(key)
          : sentBefore(rowById.get(r.itemId)?.reminded_slots, rowById.get(r.itemId)?.last_reminded_on).includes(key)
            || (newSlots.get(r.itemId) || []).includes(key)
        if (already) continue

        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          JSON.stringify({
            title: `${r.emoji || '🌿'} ${r.name}`,
            body: r.note ? `Time for ${r.name} — ${r.note}` : `Time for ${r.name}`,
            // Distinct per occurrence, so a later one doesn't replace an earlier one in the tray.
            tag: `rhythm-${r.itemId}-${r.time}`,
          })
        ).catch(async (err) => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
          }
        })
        sent++

        if (r.inProgram) {
          programSlots = [...programSlots, key]
          programChanged = true
        } else {
          newSlots.set(r.itemId, [...(newSlots.get(r.itemId) || []), key])
        }
      }

      for (const [itemId, times] of newSlots) {
        const row = rowById.get(itemId)
        await supabaseAdmin
          .from('rhythm_items')
          .update({ last_reminded_on: today, reminded_slots: [...sentBefore(row?.reminded_slots, row?.last_reminded_on), ...times] })
          .eq('id', itemId)
      }
      if (programChanged) {
        await supabaseAdmin
          .from('active_protocols')
          .update({ reminded_on: today, reminded_slots: programSlots })
          .eq('id', programRow.id)
      }
    } catch (err) {
      console.warn(`Rhythm reminder failed for subscription ${sub.endpoint?.slice(-12)}:`, err.message)
    }
  }

  if (sent > 0) console.log(`🕐 Rhythm reminders sent: ${sent}`)
}
