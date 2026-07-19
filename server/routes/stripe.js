import { Router } from 'express'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const router = Router()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Shared helper — get or create Stripe customer
async function getOrCreateCustomer(userId, email) {
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .single()
  if (existing?.stripe_customer_id) return existing.stripe_customer_id
  const customer = await stripe.customers.create({ email, metadata: { supabase_user_id: userId } })
  return customer.id
}

// Monthly-only since 2026-07-19 (user decision: annual refund liability if
// the app ever winds down). STRIPE_ANNUAL_PRICE_ID stays in the env unused
// so annuals can come back with one line once the app has earned its keep.
const PLAN_PRICES = () => ({
  rhythm: process.env.STRIPE_RHYTHM_PRICE_ID,             // $7.97/mo engine-only
  healer: process.env.STRIPE_PRICE_ID,                     // $24.97/mo full companion
  practitioner: process.env.STRIPE_PRACTITIONER_PRICE_ID,  // $99/mo client portal
})

// Create Stripe Checkout session (rhythm or healer plan)
router.post('/checkout', async (req, res) => {
  const { userId, email, plan = 'healer' } = req.body
  if (!userId || !email) return res.status(400).json({ error: 'userId and email required' })
  const priceId = PLAN_PRICES()[plan]
  if (!priceId) return res.status(400).json({ error: `Unknown or unconfigured plan: ${plan}` })
  const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'
  try {
    const customerId = await getOrCreateCustomer(userId, email)
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      // No Stripe-side trial: the 7 free days live in the app (useSubscription
      // counts from account creation). Card is charged as soon as they subscribe —
      // otherwise the two trials stack into 14 free days.
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${CLIENT_URL}?subscribed=true`,
      cancel_url: `${CLIENT_URL}?tab=account`,
      allow_promotion_codes: true,
    })
    await supabase.from('subscriptions').upsert({
      user_id: userId, stripe_customer_id: customerId,
      status: 'pending', updated_at: new Date().toISOString(),
    })
    res.json({ url: session.url })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Switch an EXISTING subscription between rhythm and healer — updates the
// live subscription item (with proration) instead of opening a new checkout,
// which would leave the old subscription billing alongside the new one.
router.post('/change-plan', async (req, res) => {
  const { userId, plan } = req.body
  if (!userId || !plan) return res.status(400).json({ error: 'userId and plan required' })
  const priceId = PLAN_PRICES()[plan]
  if (!priceId) return res.status(400).json({ error: `Unknown or unconfigured plan: ${plan}` })
  try {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', userId)
      .single()
    if (!sub?.stripe_subscription_id) return res.status(404).json({ error: 'No subscription to change — subscribe first' })
    const current = await stripe.subscriptions.retrieve(sub.stripe_subscription_id)
    const item = current.items.data[0]
    if (item?.price?.id === priceId) return res.json({ plan, unchanged: true })
    const updated = await stripe.subscriptions.update(sub.stripe_subscription_id, {
      items: [{ id: item.id, price: priceId }],
      proration_behavior: 'create_prorations',
    })
    await supabase.from('subscriptions').update({
      plan,
      status: updated.status,
      current_period_end: new Date(updated.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('user_id', userId)
    res.json({ plan, status: updated.status })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Create Stripe Checkout session (practitioner plan — $99/month)
router.post('/checkout/practitioner', async (req, res) => {
  const { userId, email } = req.body
  if (!userId || !email) return res.status(400).json({ error: 'userId and email required' })
  if (!process.env.STRIPE_PRACTITIONER_PRICE_ID) return res.status(500).json({ error: 'Practitioner plan not configured' })
  const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'
  try {
    const customerId = await getOrCreateCustomer(userId, email)
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      // No Stripe-side trial — same reasoning as the healer checkout above.
      line_items: [{ price: process.env.STRIPE_PRACTITIONER_PRICE_ID, quantity: 1 }],
      success_url: `${CLIENT_URL}?subscribed=true&plan=practitioner`,
      cancel_url: `${CLIENT_URL}?tab=account`,
      allow_promotion_codes: true,
    })
    await supabase.from('subscriptions').upsert({
      user_id: userId, stripe_customer_id: customerId,
      status: 'pending', updated_at: new Date().toISOString(),
    })
    res.json({ url: session.url })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// One-off voice top-up purchase (mode: payment, not subscription).
// The webhook credits the minutes only after Stripe confirms payment —
// nothing in the app trusts the client's word that they paid.
router.post('/topup', async (req, res) => {
  const { userId, email } = req.body
  if (!userId || !email) return res.status(400).json({ error: 'userId and email required' })
  if (!process.env.STRIPE_TOPUP_PRICE_ID) return res.status(500).json({ error: 'Top-up not configured' })
  const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'
  const topupSeconds = (parseInt(process.env.TOPUP_MINUTES, 10) || 30) * 60
  try {
    const customerId = await getOrCreateCustomer(userId, email)
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: process.env.STRIPE_TOPUP_PRICE_ID, quantity: 1 }],
      metadata: { supabase_user_id: userId, topup_seconds: String(topupSeconds) },
      success_url: `${CLIENT_URL}?topup=success`,
      cancel_url: `${CLIENT_URL}?tab=settings`,
    })
    res.json({ url: session.url })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Stripe webhook — keeps subscription status in sync
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature']
  let event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    return res.status(400).json({ error: `Webhook error: ${err.message}` })
  }

  const getUserId = async (customerId) => {
    const customer = await stripe.customers.retrieve(customerId)
    return customer.deleted ? null : customer.metadata?.supabase_user_id
  }

  const planForPrice = (priceId) =>
    priceId === process.env.STRIPE_PRACTITIONER_PRICE_ID ? 'practitioner'
    : priceId === process.env.STRIPE_RHYTHM_PRICE_ID ? 'rhythm'
    : 'healer'

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object

        // Voice top-up: credit the minutes onto this month's meter row.
        // Additive update (read-then-write via the service role) so buying
        // twice in a month stacks rather than replaces.
        if (session.mode === 'payment' && session.metadata?.topup_seconds) {
          const userId = session.metadata.supabase_user_id
          const seconds = parseInt(session.metadata.topup_seconds, 10) || 0
          if (userId && seconds > 0) {
            const d = new Date()
            const periodMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
            const { data: meter } = await supabase
              .from('voice_usage_meter')
              .select('evi_seconds_used, evi_seconds_included, topup_seconds_remaining')
              .eq('user_id', userId)
              .eq('period_month', periodMonth)
              .maybeSingle()
            await supabase.from('voice_usage_meter').upsert({
              user_id: userId,
              period_month: periodMonth,
              evi_seconds_used: meter?.evi_seconds_used ?? 0,
              evi_seconds_included: meter?.evi_seconds_included ?? 0,
              topup_seconds_remaining: (meter?.topup_seconds_remaining ?? 0) + seconds,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id,period_month' })
            console.log(`Voice top-up credited: ${seconds}s for ${userId}`)
          }
          break
        }

        if (session.mode !== 'subscription') break
        const userId = await getUserId(session.customer)
        if (!userId) break
        const sub = await stripe.subscriptions.retrieve(session.subscription)
        const plan = planForPrice(sub.items.data[0]?.price?.id)
        await supabase.from('subscriptions').upsert({
          user_id: userId,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          status: sub.status,
          plan,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object
        const userId = await getUserId(sub.customer)
        if (!userId) break
        const plan = planForPrice(sub.items.data[0]?.price?.id)
        await supabase.from('subscriptions').upsert({
          user_id: userId,
          stripe_customer_id: sub.customer,
          stripe_subscription_id: sub.id,
          status: sub.status,
          plan,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        if (!invoice.subscription) break
        const userId = await getUserId(invoice.customer)
        if (!userId) break
        const sub = await stripe.subscriptions.retrieve(invoice.subscription)
        await supabase.from('subscriptions').upsert({
          user_id: userId,
          stripe_customer_id: invoice.customer,
          stripe_subscription_id: invoice.subscription,
          status: sub.status,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        break
      }
    }
  } catch (err) {
    console.error('Webhook processing error:', err.message)
  }

  res.json({ received: true })
})

// Get current subscription status for a user
router.get('/subscription', async (req, res) => {
  const { userId } = req.query
  if (!userId) return res.status(400).json({ error: 'userId required' })
  try {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single()
    if (!sub?.stripe_subscription_id) return res.json({ status: 'none' })
    const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id)
    res.json({
      status: stripeSub.status,
      plan: sub.plan,
      current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
      cancel_at_period_end: stripeSub.cancel_at_period_end,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Cancel subscription at period end (keeps access until renewal date)
router.post('/cancel', async (req, res) => {
  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: 'userId required' })
  try {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', userId)
      .single()
    if (!sub?.stripe_subscription_id) return res.status(404).json({ error: 'No subscription found' })
    const updated = await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: true,
    })
    await supabase.from('subscriptions').update({
      cancel_at_period_end: true,
      updated_at: new Date().toISOString(),
    }).eq('user_id', userId)
    res.json({ cancel_at_period_end: updated.cancel_at_period_end, current_period_end: new Date(updated.current_period_end * 1000).toISOString() })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Resume a subscription that was set to cancel at period end
router.post('/resume', async (req, res) => {
  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: 'userId required' })
  try {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', userId)
      .single()
    if (!sub?.stripe_subscription_id) return res.status(404).json({ error: 'No subscription found' })
    const updated = await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: false,
    })
    await supabase.from('subscriptions').update({
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    }).eq('user_id', userId)
    res.json({ cancel_at_period_end: updated.cancel_at_period_end, current_period_end: new Date(updated.current_period_end * 1000).toISOString() })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Stripe Customer Portal — lets subscriber manage their own billing
router.post('/portal', async (req, res) => {
  const { userId } = req.body
  const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .single()

  if (!sub?.stripe_customer_id) {
    return res.status(404).json({ error: 'No subscription found' })
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: CLIENT_URL,
    })
    res.json({ url: session.url })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
