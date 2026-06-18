import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const router = Router()
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'allij@live.com.au'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Log an analytics event (fire-and-forget from frontend)
router.post('/event', async (req, res) => {
  const { userId, eventType, properties = {} } = req.body
  if (!eventType) return res.status(400).json({ error: 'eventType required' })

  await supabaseAdmin.from('analytics_events').insert({
    user_id: userId || null,
    event_type: eventType,
    properties,
  })

  res.json({ ok: true })
})

// Admin summary — locked to ADMIN_EMAIL
router.get('/admin/:userId', async (req, res) => {
  const { userId } = req.params

  // Verify the requesting user is the admin
  const { data: user } = await supabaseAdmin.auth.admin.getUserById(userId)
  if (user?.user?.email !== ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const now = new Date()
  const day7 = new Date(now - 7 * 86400000).toISOString()
  const day30 = new Date(now - 30 * 86400000).toISOString()

  // Run all queries in parallel
  const [
    totalUsersRes,
    activeWeekRes,
    activeMonthRes,
    eventCountsRes,
    dailyCheckinsRes,
    tabViewsRes,
    circleJoinsRes,
    subRes,
    latestDigestRes,
  ] = await Promise.all([
    supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('analytics_events').select('user_id', { count: 'exact', head: true })
      .gte('created_at', day7).not('user_id', 'is', null),
    supabaseAdmin.from('analytics_events').select('user_id', { count: 'exact', head: true })
      .gte('created_at', day30).not('user_id', 'is', null),
    supabaseAdmin.from('analytics_events').select('event_type').gte('created_at', day7),
    supabaseAdmin.from('daily_checkins').select('check_date').gte('check_date', day7.split('T')[0]),
    supabaseAdmin.from('analytics_events').select('properties').eq('event_type', 'tab_view').gte('created_at', day7),
    supabaseAdmin.from('circle_members').select('circle_id').gte('joined_at', day30),
    supabaseAdmin.from('subscriptions').select('plan, status').eq('status', 'active'),
    supabaseAdmin.from('analytics_events').select('properties').eq('event_type', 'weekly_digest').order('created_at', { ascending: false }).limit(1).single(),
  ])

  // Event type counts
  const eventCounts = {}
  for (const e of (eventCountsRes.data || [])) {
    eventCounts[e.event_type] = (eventCounts[e.event_type] || 0) + 1
  }

  // Tab view counts
  const tabCounts = {}
  for (const e of (tabViewsRes.data || [])) {
    const tab = e.properties?.tab
    if (tab) tabCounts[tab] = (tabCounts[tab] || 0) + 1
  }

  // Circle join counts
  const circleCounts = {}
  for (const e of (circleJoinsRes.data || [])) {
    const c = e.circle_id
    if (c) circleCounts[c] = (circleCounts[c] || 0) + 1
  }

  // Subscription breakdown
  const subBreakdown = { healer: 0, practitioner: 0 }
  for (const s of (subRes.data || [])) {
    const plan = s.plan || 'healer'
    subBreakdown[plan] = (subBreakdown[plan] || 0) + 1
  }

  res.json({
    users: {
      total: totalUsersRes.count || 0,
      activeWeek: activeWeekRes.count || 0,
      activeMonth: activeMonthRes.count || 0,
    },
    subscriptions: subBreakdown,
    revenue: {
      monthly: (subBreakdown.healer * 9.97 + subBreakdown.practitioner * 49).toFixed(2),
    },
    events7d: eventCounts,
    topTabs: Object.entries(tabCounts).sort((a, b) => b[1] - a[1]).slice(0, 8),
    topCircles: Object.entries(circleCounts).sort((a, b) => b[1] - a[1]).slice(0, 5),
    checkinsThisWeek: dailyCheckinsRes.data?.length || 0,
    latestDigest: latestDigestRes.data?.properties || null,
  })
})

// Weekly digest — called by cron every Monday
// Stores result as an analytics_event so admin dashboard can display it
export async function generateWeeklyDigest() {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const day7 = new Date(Date.now() - 7 * 86400000).toISOString()

  const [profilesRes, checkinsRes, eventsRes, subsRes] = await Promise.all([
    supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('daily_checkins').select('energy, celery_oz, symptoms').gte('check_date', day7.split('T')[0]),
    supabaseAdmin.from('analytics_events').select('event_type').gte('created_at', day7),
    supabaseAdmin.from('subscriptions').select('plan, status').eq('status', 'active'),
  ])

  const checkins = checkinsRes.data || []
  const avgEnergy = checkins.length
    ? (checkins.reduce((s, c) => s + (c.energy || 0), 0) / checkins.length).toFixed(1)
    : 0
  const celeryCt = checkins.filter(c => c.celery_oz > 0).length
  const eventCounts = {}
  for (const e of (eventsRes.data || [])) {
    eventCounts[e.event_type] = (eventCounts[e.event_type] || 0) + 1
  }
  const totalSubs = (subsRes.data || []).length

  const summary = `CelerySync weekly data: ${profilesRes.count} total users, ${totalSubs} active subscribers, ${checkins.length} check-ins this week, avg energy ${avgEnergy}/10, ${celeryCt} celery juice days logged. Top events: ${Object.entries(eventCounts).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v])=>`${k}(${v})`).join(', ')}.`

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `You are the CelerySync app assistant giving a weekly health report to Alli, the founder. Based on this data: ${summary}. Write a warm, encouraging 3-sentence summary of the week's healing community activity. Mention specific numbers. End with one actionable suggestion for improving engagement. Keep it under 80 words.`,
    }],
  })

  const digest = response.content.find(b => b.type === 'text')?.text || ''

  // Store as a special analytics event so admin dashboard can read it
  await supabaseAdmin.from('analytics_events').insert({
    user_id: null,
    event_type: 'weekly_digest',
    properties: {
      digest,
      stats: { totalUsers: profilesRes.count, totalSubs, checkinsThisWeek: checkins.length, avgEnergy, celeryCt },
      generatedAt: new Date().toISOString(),
    },
  })

  console.log('📊 Weekly digest generated')
}

export default router
