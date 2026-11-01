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

    const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    if (error) throw error
    res.json({ deleted: true })
  } catch (err) {
    console.error('Account delete failed:', err.message)
    res.status(500).json({ error: "Sorry — the account couldn't be deleted just now. Please try again, or email us and we'll do it for you." })
  }
})

export default router
