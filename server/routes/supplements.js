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

function formatRunOutDate(date, daysRemaining) {
  if (daysRemaining <= 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' })
  }
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
}

// Deterministic templates — never routed through the model. This is a numeric
// fact (units on hand / daily use), not something worth the risk of an LLM
// inventing a claim or brand mention for.
function buildAlertMessage(name, daysRemaining, runOutDate) {
  if (daysRemaining <= 0) {
    return `Looks like your ${name} may have run out — grab more whenever you can.`
  }
  const when = formatRunOutDate(runOutDate, daysRemaining)
  const phrase = daysRemaining <= 7
    ? `runs out around ${when} — time to reorder so you don't break your rhythm.`
    : `runs out around ${when} — worth adding to your next order.`
  return `Your ${name} ${phrase}`
}

// Daily check — for every supplement with tracking enabled (units_on_hand set)
// and not already alerted, compute projected run-out and send a push if within
// the user's threshold. No LLM call; pure arithmetic + a template.
export async function checkRestockAlerts() {
  const { data: rows } = await supabaseAdmin
    .from('supplement_inventory')
    .select('*')
    .not('units_on_hand', 'is', null)
    .is('low_stock_alerted_on', null)

  if (!rows?.length) {
    console.log('💊 No supplement inventory due for a restock check')
    return
  }

  const today = todayStr()
  let sent = 0

  for (const row of rows) {
    try {
      const { data: doseRows } = await supabaseAdmin
        .from('user_supplements')
        .select('id')
        .eq('profile_id', row.profile_id)
        .ilike('name', row.supplement_name)
      const dosesPerDay = doseRows?.length || 0
      if (!dosesPerDay) continue // not currently scheduled — nothing to project

      const dailyUse = (row.units_per_dose || 1) * dosesPerDay
      if (!dailyUse) continue
      const daysRemaining = Math.floor(row.units_on_hand / dailyUse)
      if (daysRemaining > row.restock_threshold_days) continue

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('user_id')
        .eq('id', row.profile_id)
        .maybeSingle()
      if (!profile?.user_id) continue

      const { data: subs } = await supabaseAdmin
        .from('push_subscriptions')
        .select('endpoint, keys')
        .eq('user_id', profile.user_id)
      if (!subs?.length) continue

      const runOutDate = new Date()
      runOutDate.setDate(runOutDate.getDate() + daysRemaining)
      const message = buildAlertMessage(row.supplement_name, daysRemaining, runOutDate)

      await Promise.allSettled(
        subs.map((sub) =>
          webpush.sendNotification(
            { endpoint: sub.endpoint, keys: sub.keys },
            JSON.stringify({ title: '📦 Restock reminder', body: message, tag: 'restock-alert' })
          ).catch(async (err) => {
            if (err.statusCode === 410 || err.statusCode === 404) {
              await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
            }
          })
        )
      )

      await supabaseAdmin
        .from('supplement_inventory')
        .update({ low_stock_alerted_on: today })
        .eq('id', row.id)

      sent++
    } catch (err) {
      console.warn(`Restock check failed for inventory row ${row.id}:`, err.message)
    }
  }

  console.log(`💊 Restock alerts sent: ${sent}`)
}
