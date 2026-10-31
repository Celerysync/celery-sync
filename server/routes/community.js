import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'

// "You're not alone" — the only community feature, deliberately: an
// anonymous count of how many people showed up for their own rhythm today.
// No posts, names or messages, so nothing to moderate and no user-written
// health claims (a TGA testimonial risk). Users' own apps can't count across
// accounts (RLS, correctly), so the server does it with the service role and
// returns a single number.
const router = Router()
const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Below this the number would be meaningless or near-identifying ("2 people"
// on a small app is practically naming someone) — return nothing instead.
const MIN_TO_SHOW = 5
const CACHE_MS = 5 * 60 * 1000
const cache = new Map() // date -> { at, count }

router.get('/today', async (req, res) => {
  // The client sends its own calendar date (check_date is stored in the
  // user's local day). Accept only dates within a day of the server's, so
  // this can't be used to probe arbitrary history.
  const date = String(req.query.date || '')
  const ms = Date.parse(date + 'T12:00:00Z')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(ms) || Math.abs(ms - Date.now()) > 36 * 3600 * 1000) {
    return res.status(400).json({ error: 'date must be today (YYYY-MM-DD)' })
  }
  const hit = cache.get(date)
  if (hit && Date.now() - hit.at < CACHE_MS) return res.json({ count: hit.count })
  try {
    const { count, error } = await supabaseAdmin
      .from('daily_checkins')
      .select('profile_id', { count: 'exact', head: true })
      .eq('check_date', date)
      .gt('rhythm_completed', 0)
    if (error) throw error
    const shown = (count || 0) >= MIN_TO_SHOW ? count : null
    cache.set(date, { at: Date.now(), count: shown })
    res.json({ count: shown })
  } catch (err) {
    res.json({ count: null })
  }
})

export default router
