import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const router = Router()
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null

// POST /api/account/delete — the signed-in user deletes their own account
// (Privacy Policy: "Settings → Delete my account"). req.user is set by the
// auth middleware in server/api.js; nothing here takes an id from the page.
//
// Most tables cascade from auth.users / profiles, but a few link to the user
// without ON DELETE CASCADE. Those would make deleteUser fail (profile_carers
// for someone who is a carer for another person), so they're cleared first.
router.post('/delete', async (req, res) => {
  const user = req.user
  if (!user) return res.status(401).json({ error: 'Please sign in again.' })
  if (req.body?.confirm !== 'DELETE') return res.status(400).json({ error: 'Type DELETE to confirm.' })

  try {
    // Stop billing first, so nobody is charged for a deleted account.
    const { data: subs } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_subscription_id, status')
      .eq('user_id', user.id)
    for (const s of subs || []) {
      if (stripe && s.stripe_subscription_id && !['canceled', 'incomplete_expired'].includes(s.status)) {
        try { await stripe.subscriptions.cancel(s.stripe_subscription_id) } catch (e) {
          if (e?.code !== 'resource_missing') throw e
        }
      }
    }

    // Links that don't cascade from the user.
    await supabaseAdmin.from('profile_carers').delete().or(`carer_id.eq.${user.id},owner_id.eq.${user.id}`)
    for (const table of ['healing_milestones', 'weekly_summaries', 'healing_letters']) {
      const { error } = await supabaseAdmin.from(table).delete().eq('user_id', user.id)
      if (error && error.code !== '42P01') throw new Error(`${table}: ${error.message}`)
    }

    // Their Kitchen photos live in storage under <user id>/, which doesn't
    // cascade from the account. Remove them before the account goes.
    await removeKitchenPhotos(user.id)

    const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    if (error) throw error
    res.json({ deleted: true })
  } catch (err) {
    console.error('Account delete failed:', err.message)
    res.status(500).json({ error: "Sorry — the account couldn't be deleted just now. Please try again, or email us and we'll do it for you." })
  }
})

async function removeKitchenPhotos(userId) {
  for (let i = 0; i < 50; i++) {
    const { data, error } = await supabaseAdmin.storage.from('kitchen-photos').list(userId, { limit: 100 })
    if (error || !data?.length) return
    const { error: rmError } = await supabaseAdmin.storage.from('kitchen-photos').remove(data.map((f) => `${userId}/${f.name}`))
    if (rmError) throw new Error(`kitchen photos: ${rmError.message}`)
  }
}

// GET /api/account/export — everything we hold about the signed-in person,
// as one JSON file (Privacy Policy: access + portability, GDPR Art. 15/20,
// Australian Privacy Principle 12). Only their own rows: user-level tables
// by user id, the rest by the profiles they own. Secrets are left out —
// push-subscription keys, wearable tokens, Stripe ids.
const USER_TABLES = [
  'profiles', 'user_voice_prefs', 'voice_usage_meter', 'companion_sessions', 'voice_turns',
  'analytics_events', 'push_subscriptions', 'wearable_tokens', 'profile_carers',
]
const PROFILE_TABLES = [
  'rhythm_items', 'rhythm_item_changes', 'activity_events', 'daily_checkins', 'conversations',
  'user_supplements', 'supplement_inventory', 'supplement_logs', 'saved_rhythms', 'active_protocols',
  'healing_profiles', 'healing_milestones', 'healing_letters', 'weekly_summaries', 'cycle_logs',
  'kitchen_items', 'shopping_list_items', 'meal_plan_entries',
]
const LEAVE_OUT = { push_subscriptions: ['keys', 'endpoint'], wearable_tokens: ['token', 'access_token', 'refresh_token'] }

router.get('/export', async (req, res) => {
  const user = req.user
  if (!user) return res.status(401).json({ error: 'Please sign in again.' })
  try {
    const out = {
      exported_at: new Date().toISOString(),
      account: { email: user.email, created_at: user.created_at, agreements: {
        age_confirmed_18: user.user_metadata?.age_confirmed_18 ?? null,
        agreed_terms_at: user.user_metadata?.agreed_terms_at ?? null,
        health_data_consent_at: user.user_metadata?.health_data_consent_at ?? null,
      } },
      data: {},
    }
    const strip = (table, rows) => (rows || []).map((r) => {
      const copy = { ...r }
      for (const k of LEAVE_OUT[table] || []) delete copy[k]
      return copy
    })
    for (const table of USER_TABLES) {
      const col = table === 'profile_carers' ? 'owner_id' : 'user_id'
      const { data, error } = await supabaseAdmin.from(table).select('*').eq(col, user.id)
      if (!error) out.data[table] = strip(table, data)
    }
    const { data: plan } = await supabaseAdmin.from('subscriptions').select('plan, status, current_period_end').eq('user_id', user.id)
    out.data.subscriptions = plan || []
    const profileIds = (out.data.profiles || []).map((p) => p.id)
    if (profileIds.length) {
      for (const table of PROFILE_TABLES) {
        const { data, error } = await supabaseAdmin.from(table).select('*').in('profile_id', profileIds)
        if (!error) out.data[table] = strip(table, data)
      }
    }
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="celerysync-my-data-${new Date().toISOString().slice(0, 10)}.json"`)
    res.send(JSON.stringify(out, null, 2))
  } catch (err) {
    console.error('Data export failed:', err.message)
    res.status(500).json({ error: "Your data couldn't be gathered just now — please try again, or email us." })
  }
})

export default router
