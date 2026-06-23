import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import PDFDocument from 'pdfkit'
import { Resend } from 'resend'

const router = Router()
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

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

  const result = saved || row

  // Send email (fire-and-forget — don't block the response)
  if (saved && !saved.email_sent) {
    sendWeeklySummaryEmail(userId, saved).catch(e => console.warn('Email error:', e.message))
  }

  return result
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

// ── Weekly summary PDF download ──
router.get('/weekly/:profileId/pdf', async (req, res) => {
  const { profileId } = req.params
  try {
    const { data: summaries } = await supabaseAdmin
      .from('weekly_summaries')
      .select('*')
      .eq('profile_id', profileId)
      .order('week_start', { ascending: false })
      .limit(1)

    if (!summaries?.length) return res.status(404).json({ error: 'No summary found' })

    const summary = summaries[0]
    const pdfBuffer = await buildWeeklyPDF(summary, false)

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="healing-summary-${summary.week_start}.pdf"`)
    res.send(pdfBuffer)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Get healing letters for a profile ──
router.get('/letters/:profileId', async (req, res) => {
  const { profileId } = req.params
  try {
    const { data } = await supabaseAdmin
      .from('healing_letters')
      .select('*')
      .eq('profile_id', profileId)
      .order('year_number', { ascending: false })
    res.json({ letters: data || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Annual letter PDF download ──
router.get('/letters/:profileId/:letterId/pdf', async (req, res) => {
  const { profileId, letterId } = req.params
  try {
    const { data: letter } = await supabaseAdmin
      .from('healing_letters')
      .select('*')
      .eq('id', letterId)
      .eq('profile_id', profileId)
      .single()
    if (!letter) return res.status(404).json({ error: 'Letter not found' })

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('name')
      .eq('id', profileId)
      .single()

    const { data: milestones } = await supabaseAdmin
      .from('healing_milestones')
      .select('insight, session_date')
      .eq('profile_id', profileId)
      .order('session_date', { ascending: true })
      .limit(30)

    const pdf = await buildAnnualLetterPDF(letter, profile?.name || 'Friend', milestones || [])
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="healing-letter-year-${letter.year_number}.pdf"`)
    res.send(pdf)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Doctor report PDF download ──
router.get('/doctor/:profileId/pdf', async (req, res) => {
  const { profileId } = req.params
  const { months = 3, extended = 'false' } = req.query
  try {
    const cutoff = new Date()
    cutoff.setMonth(cutoff.getMonth() - Number(months))
    const cutoffStr = cutoff.toISOString().split('T')[0]

    const [summariesRes, milestonesRes, profileRes] = await Promise.all([
      supabaseAdmin
        .from('weekly_summaries')
        .select('*')
        .eq('profile_id', profileId)
        .gte('week_start', cutoffStr)
        .order('week_start', { ascending: true }),
      supabaseAdmin
        .from('healing_milestones')
        .select('insight, category, session_date')
        .eq('profile_id', profileId)
        .gte('session_date', cutoffStr)
        .order('session_date', { ascending: true }),
      supabaseAdmin
        .from('healing_profiles')
        .select('healing_summary')
        .eq('profile_id', profileId)
        .maybeSingle(),
    ])

    const pdfBuffer = await buildDoctorPDF({
      summaries: summariesRes.data || [],
      milestones: milestonesRes.data || [],
      healingSummary: profileRes.data?.healing_summary || '',
      profileId,
      months: Number(months),
      isExtended: extended === 'true',
    })

    const dateStr = new Date().toISOString().split('T')[0]
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="health-report-${dateStr}.pdf"`)
    res.send(pdfBuffer)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Build weekly healing summary PDF ──
async function buildWeeklyPDF(summary, forEmail = false) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4', info: { Title: 'CelerySync Weekly Healing Summary' } })
    const chunks = []
    doc.on('data', c => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const GREEN = '#3D6B44'
    const GOLD = '#C8973A'
    const CREAM = '#F7F9F4'
    const CHARCOAL = '#1e2a1e'
    const MUTED = '#6b7c6b'
    const pageW = doc.page.width - 100

    // ── Header ──
    doc.rect(0, 0, doc.page.width, 110).fill(GREEN)
    doc.fillColor('#fff').fontSize(28).font('Helvetica-Bold').text('🌿 CelerySync', 50, 28)
    doc.fontSize(13).font('Helvetica').text('Weekly Healing Summary', 50, 60)
    doc.fontSize(11).fillColor('rgba(255,255,255,0.8)').text(
      `${fmtDate(summary.week_start)} — ${fmtDate(summary.week_end)}`,
      50, 80
    )

    // ── Metrics grid ──
    doc.fillColor(CHARCOAL).fontSize(14).font('Helvetica-Bold').text('This Week', 50, 130)

    const metrics = [
      { label: 'Celery Juice', value: `${summary.celery_days}/7 days`, max: 7, current: summary.celery_days, emoji: '🥬' },
      { label: 'Avg Energy', value: `${summary.avg_energy ?? '—'}/10`, max: 10, current: summary.avg_energy, emoji: '⚡' },
      { label: 'Morning Protocol', value: `${summary.protocol_days}/7 days`, max: 7, current: summary.protocol_days, emoji: '☀️' },
      { label: 'Avg Mood', value: `${summary.avg_mood ?? '—'}/5`, max: 5, current: summary.avg_mood, emoji: '😊' },
    ]

    let y = 155
    metrics.forEach((m, i) => {
      const x = i % 2 === 0 ? 50 : 310
      if (i === 2) y += 70

      doc.rect(x, y, 220, 55).fill(CREAM).stroke('#e0e8db')
      doc.fillColor(CHARCOAL).fontSize(11).font('Helvetica-Bold').text(`${m.emoji}  ${m.label}`, x + 10, y + 10)
      doc.fillColor(GREEN).fontSize(16).font('Helvetica-Bold').text(m.value, x + 10, y + 28)

      // Progress bar
      const barW = 200
      const filled = m.current ? Math.min((m.current / m.max) * barW, barW) : 0
      doc.rect(x + 10, y + 48, barW, 4).fill('#e0e8db')
      if (filled > 0) doc.rect(x + 10, y + 48, filled, 4).fill(GREEN)
    })

    y += 90

    // ── AI Observations ──
    if (summary.ai_observations) {
      doc.rect(50, y, pageW, 8).fill(GREEN)
      y += 20
      doc.fillColor(CHARCOAL).fontSize(14).font('Helvetica-Bold').text("Your Healing Companion's Observations", 50, y)
      y += 22
      doc.rect(50, y, pageW, 1).fill('#e0e8db')
      y += 12
      doc.fillColor(CHARCOAL).fontSize(11).font('Helvetica').text(summary.ai_observations, 50, y, { width: pageW, lineGap: 4 })
      y = doc.y + 20
    }

    // ── Milestones this week ──
    const milestones = Array.isArray(summary.milestones_this_week) ? summary.milestones_this_week : []
    if (milestones.length) {
      doc.rect(50, y, pageW, 8).fill(GOLD)
      y += 20
      doc.fillColor(CHARCOAL).fontSize(14).font('Helvetica-Bold').text('Key Moments This Week', 50, y)
      y += 22
      milestones.forEach(m => {
        doc.fillColor(GREEN).fontSize(11).font('Helvetica-Bold').text('•', 50, y)
        doc.fillColor(CHARCOAL).font('Helvetica').text(m.insight || m, 65, y, { width: pageW - 15 })
        y = doc.y + 4
      })
      y += 10
    }

    // ── Footer ──
    doc.rect(0, doc.page.height - 50, doc.page.width, 50).fill(GREEN)
    doc.fillColor('rgba(255,255,255,0.7)').fontSize(9).font('Helvetica')
      .text(
        'CelerySync — Inspired by the teachings of Anthony William · Medical Medium  |  This is a personal health tracking record, not medical advice.',
        50, doc.page.height - 35, { width: pageW, align: 'center' }
      )

    doc.end()
  })
}

// ── Build doctor report PDF ──
async function buildDoctorPDF({ summaries, milestones, healingSummary, months, isExtended = false }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4', info: { Title: 'Personal Health Tracking Report' } })
    const chunks = []
    doc.on('data', c => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const BLUE = '#1a365d'
    const CHARCOAL = '#1e2a1e'
    const MUTED = '#6b7c6b'
    const pageW = doc.page.width - 100
    const today = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
    const periodStart = summaries[0]?.week_start ? fmtDate(summaries[0].week_start) : `${months} months ago`
    const periodEnd = summaries[summaries.length - 1]?.week_end ? fmtDate(summaries[summaries.length - 1].week_end) : 'present'

    // ── Header ──
    doc.fontSize(20).font('Helvetica-Bold').fillColor(BLUE).text('PERSONAL HEALTH TRACKING REPORT', 50, 50)
    doc.fontSize(11).font('Helvetica').fillColor(MUTED).text(`Prepared by CelerySync Health Companion  |  Generated: ${today}`, 50, 80)
    doc.rect(50, 95, pageW, 1).fill('#ccc')

    // ── Report period ──
    doc.fillColor(CHARCOAL).fontSize(11).font('Helvetica-Bold').text('Report Period:', 50, 110)
    doc.font('Helvetica').text(`${periodStart} — ${periodEnd}  (${months} months)`, 155, 110)

    // ── Disclaimer ──
    doc.rect(50, 130, pageW, 48).fill('#fff8f0').stroke('#f0c090')
    doc.fillColor('#7a4800').fontSize(9).font('Helvetica-Bold').text('IMPORTANT NOTICE', 58, 138)
    doc.font('Helvetica').text(
      'This report contains self-reported personal health tracking data only. It is not a medical record and does not constitute medical advice. Please discuss all supplements and dietary changes with your healthcare provider, particularly regarding potential medication interactions.',
      58, 150, { width: pageW - 16 }
    )

    let y = 195

    // ── Average weekly metrics ──
    const weeks = summaries.length
    const avgEnergy = weeks ? (summaries.reduce((s, w) => s + (w.avg_energy || 0), 0) / weeks).toFixed(1) : null
    const avgMood = weeks ? (summaries.reduce((s, w) => s + (w.avg_mood || 0), 0) / weeks).toFixed(1) : null
    const totalCelery = summaries.reduce((s, w) => s + (w.celery_days || 0), 0)
    const totalProtocol = summaries.reduce((s, w) => s + (w.protocol_days || 0), 0)
    const totalDays = weeks * 7

    doc.fillColor(BLUE).fontSize(13).font('Helvetica-Bold').text('HEALTH METRICS (self-reported)', 50, y)
    y += 18
    doc.rect(50, y, pageW, 1).fill('#ccc')
    y += 12

    const metricRows = [
      ['Energy level (1–10 scale)', avgEnergy ? `${avgEnergy}/10 average over period` : 'Not logged'],
      ['Mood (1–5 scale)', avgMood ? `${avgMood}/5 average over period` : 'Not logged'],
      ['Celery juice days', `${totalCelery} of ${totalDays} days (${Math.round(totalCelery / totalDays * 100)}%)`],
      ['Morning protocol days', `${totalProtocol} of ${totalDays} days (${Math.round(totalProtocol / totalDays * 100)}%)`],
      ['Weekly data points', `${weeks} weeks of daily tracking`],
    ]

    metricRows.forEach(([label, value]) => {
      doc.fillColor(CHARCOAL).fontSize(10).font('Helvetica-Bold').text(label, 50, y)
      doc.font('Helvetica').text(value, 280, y)
      y += 18
    })

    y += 10
    doc.rect(50, y, pageW, 1).fill('#eee')
    y += 16

    // ── Supplement milestones ──
    const suppMilestones = milestones.filter(m => m.category === 'supplement')
    if (suppMilestones.length) {
      doc.fillColor(BLUE).fontSize(13).font('Helvetica-Bold').text('SUPPLEMENTS & PROTOCOL NOTES', 50, y)
      y += 18
      doc.rect(50, y, pageW, 1).fill('#ccc')
      y += 10
      doc.fillColor(MUTED).fontSize(9).font('Helvetica').text(
        'The following supplement notes were self-reported during the tracking period. Please review for potential interactions with prescribed medications.',
        50, y, { width: pageW }
      )
      y = doc.y + 10

      suppMilestones.forEach(m => {
        doc.fillColor(CHARCOAL).fontSize(10).font('Helvetica').text(`• [${m.session_date}]  ${m.insight}`, 50, y, { width: pageW })
        y = doc.y + 4
      })
      y += 10
      doc.rect(50, y, pageW, 1).fill('#eee')
      y += 16
    }

    // ── Symptom notes ──
    const symptomMilestones = milestones.filter(m => m.category === 'symptom' || m.category === 'pattern')
    if (symptomMilestones.length) {
      if (y > doc.page.height - 150) { doc.addPage(); y = 50 }
      doc.fillColor(BLUE).fontSize(13).font('Helvetica-Bold').text('SYMPTOM OBSERVATIONS', 50, y)
      y += 18
      doc.rect(50, y, pageW, 1).fill('#ccc')
      y += 12
      symptomMilestones.forEach(m => {
        doc.fillColor(CHARCOAL).fontSize(10).font('Helvetica').text(`• [${m.session_date}]  ${m.insight}`, 50, y, { width: pageW })
        y = doc.y + 4
      })
      y += 10
      doc.rect(50, y, pageW, 1).fill('#eee')
      y += 16
    }

    // ── Weekly energy trend ──
    if (summaries.length > 1) {
      if (y > doc.page.height - 150) { doc.addPage(); y = 50 }
      doc.fillColor(BLUE).fontSize(13).font('Helvetica-Bold').text('ENERGY TREND (weekly averages)', 50, y)
      y += 18
      doc.rect(50, y, pageW, 1).fill('#ccc')
      y += 12

      summaries.slice(-12).forEach(w => {
        const label = fmtDate(w.week_start)
        const val = w.avg_energy || 0
        const barW = val ? Math.round((val / 10) * (pageW - 120)) : 0
        doc.fillColor(MUTED).fontSize(9).font('Helvetica').text(label, 50, y, { width: 90 })
        doc.rect(145, y + 1, pageW - 120, 10).fill('#f0f0f0')
        if (barW > 0) doc.rect(145, y + 1, barW, 10).fill('#3D6B44')
        doc.fillColor(CHARCOAL).fontSize(9).text(val ? `${val}/10` : '—', 145 + (pageW - 120) + 6, y)
        y += 16
      })
      y += 10
    }

    // ── Extended: healing protocol context ──
    if (isExtended && healingSummary) {
      if (y > doc.page.height - 150) { doc.addPage(); y = 50 }
      doc.fillColor(BLUE).fontSize(13).font('Helvetica-Bold').text('HEALING PROTOCOL CONTEXT (Extended Report)', 50, y)
      y += 18
      doc.rect(50, y, pageW, 1).fill('#ccc')
      y += 10
      doc.fillColor(MUTED).fontSize(9).font('Helvetica').text(
        'This section is included for integrative health practitioners familiar with nutritional and naturopathic approaches.',
        50, y, { width: pageW }
      )
      y = doc.y + 10
      doc.fillColor(CHARCOAL).fontSize(10).font('Helvetica').text(healingSummary, 50, y, { width: pageW, lineGap: 3 })
      y = doc.y + 16
    }

    // ── Footer ──
    doc.rect(0, doc.page.height - 50, doc.page.width, 50).fill('#1a365d')
    doc.fillColor('rgba(255,255,255,0.7)').fontSize(9).font('Helvetica')
      .text(
        'CelerySync Personal Health Tracking  |  This document is for personal reference only and is not a medical record.',
        50, doc.page.height - 33, { width: pageW, align: 'center' }
      )

    doc.end()
  })
}

// ── Build annual healing letter PDF ──
async function buildAnnualLetterPDF(letter, name, milestones) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 70, size: 'A4', info: { Title: `Year ${letter.year_number} Healing Letter` } })
    const chunks = []
    doc.on('data', c => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const GREEN = '#3D6B44'
    const GOLD = '#C8973A'
    const CHARCOAL = '#1e2a1e'
    const MUTED = '#6b7c6b'
    const pageW = doc.page.width - 140

    // ── Header ──
    doc.rect(0, 0, doc.page.width, 130).fill(GREEN)
    doc.fillColor('#fff').fontSize(13).font('Helvetica').text('CelerySync', 70, 32)
    doc.fontSize(26).font('Helvetica-Bold').text(`Year ${letter.year_number} Healing Letter`, 70, 52)
    doc.fontSize(12).font('Helvetica').fillColor('rgba(255,255,255,0.8)')
      .text(`For ${name}  ·  ${new Date(letter.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}`, 70, 94)

    // ── Decorative leaf ──
    doc.fontSize(48).text('🌿', doc.page.width - 110, 40)

    let y = 160

    // ── Letter body ──
    const paragraphs = letter.letter_text.split('\n\n').filter(p => p.trim())
    paragraphs.forEach((para, i) => {
      if (y > doc.page.height - 120) { doc.addPage(); y = 70 }
      if (i === 0) {
        doc.fillColor(CHARCOAL).fontSize(14).font('Helvetica-Bold').text(para.trim(), 70, y, { width: pageW, lineGap: 4 })
      } else {
        doc.fillColor(CHARCOAL).fontSize(12).font('Helvetica').text(para.trim(), 70, y, { width: pageW, lineGap: 4 })
      }
      y = doc.y + 18
    })

    // ── Milestone timeline ──
    if (milestones.length) {
      if (y > doc.page.height - 180) { doc.addPage(); y = 70 }
      y += 10
      doc.rect(70, y, pageW, 3).fill(GOLD)
      y += 16
      doc.fillColor(GOLD).fontSize(13).font('Helvetica-Bold').text('Your Healing Milestones', 70, y)
      y += 20

      milestones.slice(0, 20).forEach(m => {
        if (y > doc.page.height - 80) { doc.addPage(); y = 70 }
        doc.fillColor(MUTED).fontSize(9).font('Helvetica').text(fmtDate(m.session_date), 70, y, { width: 90 })
        doc.fillColor(CHARCOAL).fontSize(11).text(m.insight, 168, y, { width: pageW - 98 })
        y = doc.y + 6
      })
    }

    // ── Closing ──
    if (y > doc.page.height - 120) { doc.addPage(); y = 70 }
    y += 20
    doc.rect(70, y, pageW, 1).fill('#e0e8db')
    y += 20
    doc.fillColor(GREEN).fontSize(12).font('Helvetica-Bold').text('Keep going. You are healing. 🌿', 70, y, { align: 'center', width: pageW })

    // ── Footer ──
    doc.rect(0, doc.page.height - 45, doc.page.width, 45).fill(GREEN)
    doc.fillColor('rgba(255,255,255,0.7)').fontSize(9).font('Helvetica')
      .text('CelerySync · Inspired by the teachings of Anthony William · Medical Medium', 70, doc.page.height - 30, { width: pageW, align: 'center' })

    doc.end()
  })
}

// ── Generate anniversary letters for all profiles whose anniversary is today ──
export async function generateAnniversaryLetters() {
  const today = new Date()
  const todayMonth = today.getMonth() + 1
  const todayDay = today.getDate()

  // Find profiles created on this month+day in a prior year
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, user_id, name, created_at')

  if (!profiles?.length) return

  const anniversaries = profiles.filter(p => {
    const created = new Date(p.created_at)
    return (
      created.getMonth() + 1 === todayMonth &&
      created.getDate() === todayDay &&
      created.getFullYear() < today.getFullYear()
    )
  })

  if (!anniversaries.length) {
    console.log('💌 No anniversaries today')
    return
  }

  console.log(`💌 Generating anniversary letters for ${anniversaries.length} profiles`)

  for (const profile of anniversaries) {
    const yearNumber = today.getFullYear() - new Date(profile.created_at).getFullYear()

    // Skip if letter already sent this year
    const { data: existing } = await supabaseAdmin
      .from('healing_letters')
      .select('id')
      .eq('profile_id', profile.id)
      .eq('year_number', yearNumber)
      .maybeSingle()

    if (existing) continue

    try {
      await generateAnniversaryLetterForProfile(profile, yearNumber)
      console.log(`✓ Anniversary letter: ${profile.name} — Year ${yearNumber}`)
    } catch (err) {
      console.warn(`✗ Anniversary letter failed for ${profile.id}:`, err.message)
    }
  }
}

async function generateAnniversaryLetterForProfile(profile, yearNumber) {
  const [milestonesRes, summariesRes, healingProfileRes] = await Promise.all([
    supabaseAdmin
      .from('healing_milestones')
      .select('insight, category, session_date')
      .eq('profile_id', profile.id)
      .order('session_date', { ascending: true }),
    supabaseAdmin
      .from('weekly_summaries')
      .select('week_start, celery_days, avg_energy, protocol_days')
      .eq('profile_id', profile.id)
      .order('week_start', { ascending: false })
      .limit(52),
    supabaseAdmin
      .from('healing_profiles')
      .select('healing_summary')
      .eq('profile_id', profile.id)
      .maybeSingle(),
  ])

  const milestones = milestonesRes.data || []
  const summaries = summariesRes.data || []
  const healingSummary = healingProfileRes.data?.healing_summary || ''

  // Build stats
  const totalCeleryDays = summaries.reduce((s, w) => s + (w.celery_days || 0), 0)
  const energyScores = summaries.map(w => w.avg_energy).filter(Boolean)
  const firstEnergy = energyScores.length ? energyScores[energyScores.length - 1] : null
  const recentEnergy = energyScores.length ? energyScores[0] : null
  const milestonesText = milestones.slice(0, 25).map(m => `• [${m.session_date}] ${m.insight}`).join('\n')

  const letter = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    messages: [{
      role: 'user',
      content: `Write a deeply personal, warm, emotional annual healing letter for ${profile.name} on their ${yearNumber === 1 ? 'first' : yearNumber === 2 ? 'second' : yearNumber === 3 ? 'third' : yearNumber + 'th'} anniversary of their healing journey with CelerySync.

This is NOT a generic letter. It must feel like it was written specifically for them based on their actual journey.

Their healing data:
- Years on journey: ${yearNumber}
- Total celery juice days logged: ${totalCeleryDays}
- Energy when they started: ${firstEnergy ? firstEnergy + '/10' : 'not recorded'}
- Energy recently: ${recentEnergy ? recentEnergy + '/10' : 'not recorded'}
- Healing summary: ${healingSummary.slice(0, 400) || 'Dedicated healer on the Medical Medium path'}

Key moments from their journey:
${milestonesText || 'Many conversations, much growth'}

Write the letter in 4-5 paragraphs.
- Open by acknowledging what they've been through and how far they've come — specifically.
- Reflect on specific milestones and what they mean.
- Acknowledge the hard moments (healing is not linear — don't pretend it's been easy).
- Celebrate who they've become through this process.
- Close with hope and belief in their continued healing.

Sign it: "With love and belief in your healing, Your CelerySync companion 🌿"

Write only the letter. No preamble.`,
    }],
  })

  const letterText = letter.content.find(b => b.type === 'text')?.text?.trim() || ''

  const { data: saved } = await supabaseAdmin
    .from('healing_letters')
    .insert({
      user_id: profile.user_id,
      profile_id: profile.id,
      year_number: yearNumber,
      letter_text: letterText,
    })
    .select()
    .single()

  // Send email (fire-and-forget)
  if (saved && resend) {
    sendAnniversaryEmail(profile.user_id, profile.name, yearNumber, letterText).catch(() => {})
  }

  return saved
}

async function sendAnniversaryEmail(userId, name, yearNumber, letterText) {
  if (!resend) return
  try {
    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(userId)
    const email = userRes?.user?.email
    if (!email) return

    const ordinal = yearNumber === 1 ? 'first' : yearNumber === 2 ? 'second' : yearNumber === 3 ? 'third' : `${yearNumber}th`
    const paragraphs = letterText.split('\n\n').filter(p => p.trim())

    await resend.emails.send({
      from: 'CelerySync <healing@celerysync.com>',
      to: email,
      subject: `Happy ${ordinal} healing anniversary, ${name} 🌿`,
      html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f7f9f4;font-family:Georgia,serif;">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:linear-gradient(135deg,#3D6B44,#5a9a6a);padding:40px 32px;text-align:center;color:#fff;">
    <div style="font-size:48px;margin-bottom:12px;">🌿</div>
    <h1 style="margin:0;font-size:24px;">Year ${yearNumber} of Your Healing Journey</h1>
    <p style="margin:10px 0 0;opacity:0.85;font-size:13px;">A letter just for you, ${name}</p>
  </div>
  <div style="padding:32px;color:#1e2a1e;line-height:1.85;font-size:14px;">
    ${paragraphs.map(p => `<p style="margin:0 0 20px;">${p}</p>`).join('')}
  </div>
  <div style="background:#f0f7f0;padding:20px 32px;text-align:center;">
    <a href="https://celerysync.com" style="display:inline-block;background:#3D6B44;color:#fff;border-radius:30px;padding:13px 28px;font-family:Georgia,serif;font-weight:700;font-size:14px;text-decoration:none;">Open Your Healing Journey →</a>
  </div>
  <div style="padding:16px 32px;text-align:center;border-top:1px solid #e8f0e4;">
    <p style="margin:0;font-size:11px;color:#aaa;">CelerySync · Inspired by Anthony William · Medical Medium</p>
  </div>
</div>
</body>
</html>`,
    })
    console.log(`💌 Anniversary email sent to ${email}`)
  } catch (err) {
    console.warn('Anniversary email error:', err.message)
  }
}

// ── Send weekly summary email via Resend ──
async function sendWeeklySummaryEmail(userId, summary) {
  if (!resend) return // No API key configured

  try {
    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(userId)
    const email = userRes?.user?.email
    if (!email) return

    const name = email.split('@')[0]
    const weekRange = `${fmtDate(summary.week_start)} — ${fmtDate(summary.week_end)}`
    const celeryPct = Math.round((summary.celery_days / 7) * 100)
    const protocolPct = Math.round((summary.protocol_days / 7) * 100)

    const barHtml = (pct, color) => `
      <div style="background:#e8f0e4;border-radius:4px;height:8px;width:100%;margin-top:4px;">
        <div style="background:${color};border-radius:4px;height:8px;width:${pct}%;"></div>
      </div>`

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f9f4;font-family:Georgia,serif;">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#3D6B44,#5a9a6a);padding:32px 28px;text-align:center;color:#fff;">
    <div style="font-size:40px;margin-bottom:8px;">🌿</div>
    <h1 style="margin:0;font-size:22px;font-weight:700;">Your Weekly Healing Summary</h1>
    <p style="margin:8px 0 0;opacity:0.85;font-size:13px;">${weekRange}</p>
  </div>

  <!-- Metrics -->
  <div style="padding:24px 28px;">
    <h2 style="margin:0 0 16px;font-size:15px;color:#1e2a1e;">This week at a glance</h2>

    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="padding:8px 8px 8px 0;width:50%;vertical-align:top;">
          <div style="background:#f7f9f4;border-radius:12px;padding:14px;">
            <div style="font-size:11px;color:#6b7c6b;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">🥬 Celery Juice</div>
            <div style="font-size:20px;font-weight:700;color:#3D6B44;margin-top:4px;">${summary.celery_days}/7 days</div>
            ${barHtml(celeryPct, '#3D6B44')}
          </div>
        </td>
        <td style="padding:8px 0 8px 8px;width:50%;vertical-align:top;">
          <div style="background:#f7f9f4;border-radius:12px;padding:14px;">
            <div style="font-size:11px;color:#6b7c6b;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">⚡ Avg Energy</div>
            <div style="font-size:20px;font-weight:700;color:#3D6B44;margin-top:4px;">${summary.avg_energy ?? '—'}/10</div>
            ${summary.avg_energy ? barHtml(Math.round(summary.avg_energy * 10), '#3D6B44') : ''}
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 8px 0 0;width:50%;vertical-align:top;">
          <div style="background:#f7f9f4;border-radius:12px;padding:14px;">
            <div style="font-size:11px;color:#6b7c6b;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">☀️ Protocol</div>
            <div style="font-size:20px;font-weight:700;color:#3D6B44;margin-top:4px;">${summary.protocol_days}/7 days</div>
            ${barHtml(protocolPct, '#5a9a6a')}
          </div>
        </td>
        <td style="padding:8px 0 0 8px;width:50%;vertical-align:top;">
          <div style="background:#f7f9f4;border-radius:12px;padding:14px;">
            <div style="font-size:11px;color:#6b7c6b;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">📔 Journal entries</div>
            <div style="font-size:20px;font-weight:700;color:#3D6B44;margin-top:4px;">${summary.journal_entries}</div>
          </div>
        </td>
      </tr>
    </table>
  </div>

  <!-- AI Observations -->
  ${summary.ai_observations ? `
  <div style="margin:0 28px;background:#f0f7f0;border-radius:14px;padding:20px;border-left:4px solid #3D6B44;">
    <div style="font-size:12px;color:#3D6B44;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">Your healing companion's observations</div>
    <p style="margin:0;font-size:13.5px;color:#1e2a1e;line-height:1.8;">${summary.ai_observations}</p>
  </div>` : ''}

  <!-- Milestones -->
  ${Array.isArray(summary.milestones_this_week) && summary.milestones_this_week.length ? `
  <div style="padding:20px 28px;">
    <div style="font-size:12px;color:#C8973A;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">✨ Key moments this week</div>
    ${summary.milestones_this_week.map(m => `
    <div style="display:flex;gap:8px;margin-bottom:6px;">
      <span style="color:#3D6B44;font-weight:700;">•</span>
      <span style="font-size:13px;color:#1e2a1e;line-height:1.6;">${m.insight || m}</span>
    </div>`).join('')}
  </div>` : ''}

  <!-- CTA -->
  <div style="padding:24px 28px;text-align:center;">
    <a href="https://celerysync.com" style="display:inline-block;background:#3D6B44;color:#fff;border-radius:30px;padding:14px 32px;font-family:Georgia,serif;font-weight:700;font-size:15px;text-decoration:none;">Open CelerySync →</a>
    <p style="margin:16px 0 0;font-size:12px;color:#6b7c6b;">Your healing matters. Keep going. 🌿</p>
  </div>

  <!-- Footer -->
  <div style="background:#f7f9f4;padding:16px 28px;text-align:center;border-top:1px solid #e8f0e4;">
    <p style="margin:0;font-size:11px;color:#aaa;line-height:1.6;">
      CelerySync · Inspired by the teachings of Anthony William<br>
      This is a personal health tracking record, not medical advice.
    </p>
  </div>

</div>
</body>
</html>`

    await resend.emails.send({
      from: 'CelerySync <healing@celerysync.com>',
      to: email,
      subject: `Your healing week — ${weekRange} 🌿`,
      html,
    })

    // Mark as sent
    await supabaseAdmin
      .from('weekly_summaries')
      .update({ email_sent: true })
      .eq('id', summary.id)

    console.log(`📧 Weekly email sent to ${email}`)
  } catch (err) {
    console.warn('Email send error:', err.message)
  }
}

function fmtDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
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
