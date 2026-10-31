// Bought voice minutes (top-ups) are the person's for good. Plan minutes
// refresh every month, but voice_usage_meter has one row per month, so a new
// month's row used to start topup_seconds_remaining at 0 and silently erase
// whatever they'd paid for and not yet used.
//
// When a month's row is first created, call this to carry the unused top-up
// across from their most recent earlier row. Within a month, usage spends the
// plan's included seconds first, then the top-up — so the unused top-up is
// whatever is left after usage beyond the included allowance.
export async function carriedTopupSeconds(supabase, userId, periodMonth) {
  const { data: prev } = await supabase
    .from('voice_usage_meter')
    .select('evi_seconds_used, evi_seconds_included, topup_seconds_remaining')
    .eq('user_id', userId)
    .lt('period_month', periodMonth)
    .order('period_month', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!prev) return 0
  const overIncluded = Math.max(0, (prev.evi_seconds_used ?? 0) - (prev.evi_seconds_included ?? 0))
  return Math.max(0, (prev.topup_seconds_remaining ?? 0) - overIncluded)
}
