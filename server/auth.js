import { createClient } from '@supabase/supabase-js'

// Who is asking? Every /api route used to trust a userId / profileId sent by
// the page, so anyone who learned someone's id could read their health
// reports, run up our AI and voice bills, or see the admin dashboard. Now
// the app sends its Supabase access token (src/lib/authFetch.js) and these
// checks run before the routes:
//   requireUser        — a valid login; any userId the page sends must be it
//   requireOwnProfile  — any profileId the page sends must belong to that user
// Carers and practitioners don't use profile-scoped routes (carers go
// through /api/carers/my-patients with their own id; the practitioner portal
// reads Supabase directly under RLS), so "own profile" is the right rule.

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Verifying a token is a network call to Supabase; cache good ones briefly.
const tokenCache = new Map() // token -> { user, until }
const TOKEN_TTL_MS = 60_000

async function userForToken(token) {
  const hit = tokenCache.get(token)
  if (hit && hit.until > Date.now()) return hit.user
  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data?.user) return null
  if (tokenCache.size > 1000) tokenCache.clear()
  tokenCache.set(token, { user: data.user, until: Date.now() + TOKEN_TTL_MS })
  return data.user
}

const bearer = (req) => (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim()

const USER_FIELDS = ['userId', 'user_id']
const PROFILE_FIELDS = ['profileId', 'profile_id', '__pathProfileId']
const fieldValues = (req, names) =>
  [req.params, req.query, req.body]
    .filter((src) => src && typeof src === 'object')
    .flatMap((src) => names.map((n) => src[n]))
    .filter((v) => v !== undefined && v !== null && v !== '')

// optional: true lets an unsigned request through with no identity at all
// (e.g. analytics from the landing page) — any userId it sends is dropped.
export function requireUser({ optional = false } = {}) {
  return async (req, res, next) => {
    try {
      const token = bearer(req)
      const user = token ? await userForToken(token) : null
      if (!user) {
        if (!optional) return res.status(401).json({ error: 'Please sign in again.' })
        for (const src of [req.query, req.body]) for (const n of USER_FIELDS) if (src && typeof src === 'object') delete src[n]
        return next()
      }
      if (fieldValues(req, USER_FIELDS).some((v) => String(v) !== user.id)) {
        return res.status(403).json({ error: 'Not allowed.' })
      }
      req.user = user
      next()
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  }
}

const ownedCache = new Map() // `${userId}:${profileId}` -> until
export async function requireOwnProfile(req, res, next) {
  try {
    const ids = [...new Set(fieldValues(req, PROFILE_FIELDS).map(String))]
    if (!ids.length) return next()
    if (!req.user) return res.status(401).json({ error: 'Please sign in again.' })
    const unknown = ids.filter((id) => (ownedCache.get(`${req.user.id}:${id}`) || 0) < Date.now())
    if (unknown.length) {
      const { data } = await supabaseAdmin.from('profiles').select('id').in('id', unknown).eq('user_id', req.user.id)
      const owned = new Set((data || []).map((p) => p.id))
      if (unknown.some((id) => !owned.has(id))) return res.status(403).json({ error: 'Not allowed.' })
      if (ownedCache.size > 5000) ownedCache.clear()
      for (const id of unknown) ownedCache.set(`${req.user.id}:${id}`, Date.now() + 5 * 60_000)
    }
    next()
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// IDs in the URL path (/doctor/:profileId/pdf, /status/:userId) only exist
// once a route matches, so the app-level checks above can't see them.
// router.param runs exactly then, for every route using that name.
export function guardPathIds(router) {
  router.param('userId', (req, res, next, id) =>
    req.user && String(id) === req.user.id ? next() : res.status(403).json({ error: 'Not allowed.' }))
  router.param('profileId', (req, res, next, id) => {
    req.query.__pathProfileId = id
    requireOwnProfile(req, res, (err) => { delete req.query.__pathProfileId; next(err) })
  })
  return router
}

// Run a middleware for every path under a mount EXCEPT the listed ones
// (paths are relative to the mount, e.g. '/webhook').
export const except = (paths, mw) => (req, res, next) =>
  paths.includes(req.path) ? next() : mw(req, res, next)

// Both checks, as one middleware for app.use().
export const signedInOwner = (opts) => {
  const user = requireUser(opts)
  return (req, res, next) => user(req, res, (err) => (err ? next(err) : requireOwnProfile(req, res, next)))
}
