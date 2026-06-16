import { Router } from 'express'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const router = Router()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Create Stripe Checkout session
router.post('/checkout', async (req, res) => {
  const { userId, email } = req.body
  if (!userId || !email) return res.status(400).json({ error: 'userId and email required' })

  const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'

  try {
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single()

    let customerId = existing?.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { supabase_user_id: userId },
      })
      customerId = customer.id
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      subscription_data: { trial_period_days: 7 },
      success_url: `${CLIENT_URL}?subscribed=true`,
      cancel_url: `${CLIENT_URL}?tab=account`,
      allow_promotion_codes: true,
    })

    await supabase.from('subscriptions').upsert({
      user_id: userId,
      stripe_customer_id: customerId,
      status: 'pending',
      updated_at: new Date().toISOString(),
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

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        if (session.mode !== 'subscription') break
        const userId = await getUserId(session.customer)
        if (!userId) break
        const sub = await stripe.subscriptions.retrieve(session.subscription)
        await supabase.from('subscriptions').upsert({
          user_id: userId,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          status: sub.status,
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
        await supabase.from('subscriptions').upsert({
          user_id: userId,
          stripe_customer_id: sub.customer,
          stripe_subscription_id: sub.id,
          status: sub.status,
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
