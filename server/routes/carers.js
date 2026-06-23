import express from 'express'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const router = express.Router()

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// POST /api/carers/invite
// Patient invites a carer by email
router.post('/invite', async (req, res) => {
  const { userId, profileId, carerEmail } = req.body
  if (!userId || !profileId || !carerEmail)
    return res.status(400).json({ error: 'userId, profileId, and carerEmail required' })

  // Verify the requesting user owns this profile
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('id, name')
    .eq('id', profileId)
    .eq('user_id', userId)
    .single()
  if (profileErr || !profile) return res.status(403).json({ error: 'Not your profile' })

  const token = crypto.randomBytes(20).toString('hex')
  const email = carerEmail.toLowerCase().trim()

  // Upsert — re-inviting same person refreshes the token and resets to pending
  const { data, error } = await supabaseAdmin
    .from('profile_carers')
    .upsert(
      { profile_id: profileId, owner_id: userId, carer_email: email, token, status: 'pending', carer_id: null, accepted_at: null },
      { onConflict: 'profile_id,carer_email' }
    )
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })

  const baseUrl = process.env.CLIENT_URL || 'https://celerysync.com'
  const inviteLink = `${baseUrl}/?carer_token=${data.token}`

  // Send email if Resend is configured
  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: 'healing@celerysync.com',
        to: email,
        subject: `You've been invited to care for ${profile.name} on CelerySync`,
        html: `
          <div style="font-family:Georgia,serif;max-width:540px;margin:0 auto;padding:32px 24px;background:#FAF7F0;">
            <div style="font-size:36px;margin-bottom:12px;">💜</div>
            <h2 style="color:#1E2A1E;margin:0 0 16px;font-size:22px;">You've been invited as a carer</h2>
            <p style="color:#5A6B5A;line-height:1.7;font-size:15px;">
              Someone who loves you has added you as a carer on CelerySync —
              an app inspired by Anthony William's Medical Medium teachings.
            </p>
            <p style="color:#5A6B5A;line-height:1.7;font-size:15px;">
              As <strong>${profile.name}'s</strong> carer, you'll see their healing progress,
              energy trends, and recent milestones — so you can support them better.
            </p>
            <a href="${inviteLink}" style="display:inline-block;margin:24px 0;padding:14px 32px;background:#3D6B44;color:#fff;text-decoration:none;border-radius:30px;font-size:16px;font-weight:700;">
              Accept invitation →
            </a>
            <p style="color:#9BA89B;font-size:12px;line-height:1.6;">
              You'll sign in to CelerySync (or create a free account) to accept.
              This link is personal to you — please don't forward it.
            </p>
          </div>
        `,
      })
    } catch (emailErr) {
      console.warn('Carer invite email failed:', emailErr.message)
    }
  }

  res.json({ success: true, inviteLink })
})

// POST /api/carers/accept
// Carer accepts an invite — must be called with the logged-in user's ID
router.post('/accept', async (req, res) => {
  const { userId, token } = req.body
  if (!userId || !token) return res.status(400).json({ error: 'userId and token required' })

  const { data, error } = await supabaseAdmin
    .from('profile_carers')
    .update({ carer_id: userId, status: 'active', accepted_at: new Date().toISOString() })
    .eq('token', token)
    .eq('status', 'pending')
    .select('profile_id')
    .single()

  if (error || !data) return res.status(404).json({ error: 'Invalid or already used invite link' })

  res.json({ success: true, profileId: data.profile_id })
})

// GET /api/carers/my-patients?userId=xxx
// Carer fetches all patients they care for, with recent check-in + milestone data
router.get('/my-patients', async (req, res) => {
  const { userId } = req.query
  if (!userId) return res.status(400).json({ error: 'userId required' })

  const { data: rels } = await supabaseAdmin
    .from('profile_carers')
    .select('profile_id')
    .eq('carer_id', userId)
    .eq('status', 'active')

  if (!rels?.length) return res.json([])

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]

  const enriched = await Promise.all(rels.map(async ({ profile_id }) => {
    const [{ data: profile }, { data: checkins }, { data: milestones }] = await Promise.all([
      supabaseAdmin.from('profiles').select('id, name, avatar_emoji, symptoms, goal, created_at').eq('id', profile_id).single(),
      supabaseAdmin.from('daily_checkins').select('check_date, energy, mood, celery_oz, morning_protocol').eq('profile_id', profile_id).gte('check_date', sevenDaysAgoStr).order('check_date', { ascending: false }),
      supabaseAdmin.from('healing_milestones').select('insight, category, session_date').eq('profile_id', profile_id).order('created_at', { ascending: false }).limit(5),
    ])
    return { ...profile, checkins: checkins || [], milestones: milestones || [] }
  }))

  res.json(enriched)
})

// GET /api/carers/for-profile/:profileId?userId=xxx
// Patient sees who their carers are
router.get('/for-profile/:profileId', async (req, res) => {
  const { userId } = req.query
  const { profileId } = req.params
  if (!userId) return res.status(400).json({ error: 'userId required' })

  const { data } = await supabaseAdmin
    .from('profile_carers')
    .select('id, carer_email, carer_id, status, accepted_at, created_at')
    .eq('profile_id', profileId)
    .eq('owner_id', userId)
    .neq('status', 'revoked')
    .order('created_at', { ascending: false })

  res.json(data || [])
})

// DELETE /api/carers/:id?userId=xxx
// Patient revokes a carer's access
router.delete('/:id', async (req, res) => {
  const { userId } = req.query
  if (!userId) return res.status(400).json({ error: 'userId required' })

  await supabaseAdmin
    .from('profile_carers')
    .delete()
    .eq('id', req.params.id)
    .eq('owner_id', userId)

  res.json({ success: true })
})

export default router
