import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const router = Router()
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ── Save milestones extracted from a Coach conversation exchange ──
router.post('/milestone', async (req, res) => {
  const { userId, profileId, userMsg, assistantMsg } = req.body
  if (!userId || !profileId || !userMsg || !assistantMsg) {
    return res.status(400).json({ error: 'missing fields' })
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Extract 1-3 specific health insights about this person from their Medical Medium healing conversation.

Focus ONLY on genuinely new, specific, memorable facts:
- Supplements they started, stopped, or changed doses
- Symptoms improving, worsening, or newly noticed
- Patterns discovered (e.g. "fatigue always worse before period")
- Healing milestones achieved (first cleanse, streak reached)
- Emotional breakthroughs or struggles
- Protocol changes made

Return a JSON array of strings only. No other text.
If nothing worth saving, return [].
Each insight max 20 words. Write as third person notes.

User said: "${userMsg.slice(0, 400)}"
Guide responded: "${assistantMsg.slice(0, 400)}"

JSON array:`,
      }],
    })

    const raw = response.content.find(b => b.type === 'text')?.text?.trim() || '[]'

    let insights = []
    try {
      const match = raw.match(/\[[\s\S]*\]/)
      insights = match ? JSON.parse(match[0]) : []
    } catch {
      insights = []
    }

    if (!insights.length) return res.json({ saved: 0 })

    const rows = insights
      .filter(i => typeof i === 'string' && i.trim().length > 5)
      .map(insight => ({
        user_id: userId,
        profile_id: profileId,
        insight: insight.trim(),
        category: categorise(insight),
        session_date: new Date().toISOString().split('T')[0],
      }))

    if (rows.length) {
      await supabaseAdmin.from('healing_milestones').insert(rows)
    }

    res.json({ saved: rows.length })
  } catch (err) {
    console.warn('Milestone extraction error:', err.message)
    res.json({ saved: 0 })
  }
})

// ── Get milestones for a profile (used to build AI context) ──
router.get('/milestones/:profileId', async (req, res) => {
  const { profileId } = req.params
  try {
    const { data } = await supabaseAdmin
      .from('healing_milestones')
      .select('insight, category, session_date')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(40)
    res.json({ milestones: data || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Generate + save weekly summary for one profile ──
router.post('/weekly/:profileId', async (req, res) => {
  const { profileId } = req.params
  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: 'userId required' })

  try {
    const summary = await generateWeeklySummaryForProfile(profileId, userId)
    res.json({ summary })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Get weekly summaries for a profile (for in-app display) ──
router.get('/weekly/:profileId', async (req, res) => {
  const { profileId } = req.params
  try {
    const { data } = await supabaseAdmin
      .from('weekly_summaries')
      .select('*')
      .eq('profile_id', profileId)
      .order('week_start', { ascending: false })
      .limit(12)
    res.json({ summaries: data || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Core: generate a weekly summary for one profile ──
async function generateWeeklySummaryForProfile(profileId, userId) {
  const today = new Date()
  const weekEnd = new Date(today)
  weekEnd.setDate(today.getDate() - today.getDay()) // last Sunday
  const weekStart = new Date(weekEnd)
  weekStart.setDate(weekEnd.getDate() - 6)

  const weekStartStr = weekStart.toISOString().split('T')[0]
  const weekEndStr = weekEnd.toISOString().split('T')[0]

  // Fetch checkins, milestones, and healing profile in parallel
  const [checkinsRes, milestonesRes, profileRes] = await Promise.all([
    supabaseAdmin
      .from('daily_checkins')
      .select('check_date, energy, mood, celery_oz, protocol_done, symptoms')
      .eq('profile_id', profileId)
      .gte('check_date', weekStartStr)
      .lte('check_date', weekEndStr),
    supabaseAdmin
      .from('healing_milestones')
      .select('insight, category, session_date')
      .eq('profile_id', profileId)
      .gte('session_date', weekStartStr)
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('healing_profiles')
      .select('healing_summary')
      .eq('profile_id', profileId)
      .maybeSingle(),
  ])

  const checkins = checkinsRes.data || []
  const milestones = milestonesRes.data || []

  const celeryDays = checkins.filter(c => (c.celery_oz || 0) > 0).length
  const protocolDays = checkins.filter(c => c.protocol_done).length
  const energies = checkins.map(c => c.energy).filter(Boolean)
  const moods = checkins.map(c => c.mood).filter(Boolean)
  const avgEnergy = energies.length
    ? parseFloat((energies.reduce((a, b) => a + b, 0) / energies.length).toFixed(1))
    : null
  const avgMood = moods.length
    ? parseFloat((moods.reduce((a, b) => a + b, 0) / moods.length).toFixed(1))
    : null

  // Generate AI observations (Haiku — cheap)
  const milestonesText = milestones.length
    ? milestones.map(m => `• ${m.insight}`).join('\n')
    : 'No specific milestones captured this week.'

  const healingSummary = profileRes.data?.healing_summary || ''

  const aiObs = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 250,
    messages: [{
      role: 'user',
      content: `Write a warm, personalised 3-sentence weekly healing observation for a Medical Medium follower.
Be specific about their numbers. Notice patterns. Be encouraging but honest.
Start with their biggest win. End with one gentle focus for next week.

This week's data:
- Celery juice: ${celeryDays}/7 days
- Morning protocol: ${protocolDays}/7 days
- Average energy: ${avgEnergy ?? 'not logged'}/10
- Average mood: ${avgMood ?? 'not logged'}/5
- Journal entries: ${checkins.length}

Key moments this week:
${milestonesText}

Healing background: ${healingSummary.slice(0, 300) || 'New subscriber'}

Write the 3-sentence observation now:`,
    }],
  })

  const observations = aiObs.content.find(b => b.type === 'text')?.text?.trim() || ''

  // Save to Supabase
  const row = {
    user_id: userId,
    profile_id: profileId,
    week_start: weekStartStr,
    week_end: weekEndStr,
    celery_days: celeryDays,
    protocol_days: protocolDays,
    avg_energy: avgEnergy,
    avg_mood: avgMood,
    journal_entries: checkins.length,
    ai_observations: observations,
    milestones_this_week: milestones,
  }

  const { data: saved } = await supabaseAdmin
    .from('weekly_summaries')
    .upsert(row, { onConflict: 'profile_id,week_start' })
    .select()
    .single()

  return saved || row
}

// ── Cron: generate summaries for all active profiles ──
export async function generateAllWeeklySummaries() {
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

  // Get all profiles that had any checkins this week
  const { data: activeCheckins } = await supabaseAdmin
    .from('daily_checkins')
    .select('profile_id, user_id')
    .gte('check_date', weekAgo)

  if (!activeCheckins?.length) {
    console.log('📊 No active profiles for weekly summary')
    return
  }

  // Deduplicate
  const seen = new Set()
  const profiles = activeCheckins.filter(c => {
    if (seen.has(c.profile_id)) return false
    seen.add(c.profile_id)
    return true
  })

  console.log(`📊 Generating weekly summaries for ${profiles.length} profiles`)

  for (const { profile_id, user_id } of profiles) {
    try {
      await generateWeeklySummaryForProfile(profile_id, user_id)
      console.log(`✓ Weekly summary: ${profile_id}`)
    } catch (err) {
      console.warn(`✗ Weekly summary failed for ${profile_id}:`, err.message)
    }
  }

  console.log('📊 Weekly summaries complete')
}

function categorise(insight) {
  const lower = insight.toLowerCase()
  if (/supplement|zinc|b12|spirulina|vitamin|lysine|magnesium|dose|mg|tsp/.test(lower)) return 'supplement'
  if (/fatigue|pain|symptom|flare|brain fog|sleep|energy|mood|ache/.test(lower)) return 'symptom'
  if (/pattern|every|always|cycle|tends to|when she|when he|when they/.test(lower)) return 'pattern'
  if (/feel|emotion|scared|hopeful|frustrated|grateful|cried|happy|anxious/.test(lower)) return 'emotion'
  if (/milestone|first|completed|streak|achieved|started|week|month|day/.test(lower)) return 'milestone'
  if (/cleanse|protocol|3:6:9|heavy metal|detox|mono/.test(lower)) return 'protocol'
  return 'general'
}

export default router
