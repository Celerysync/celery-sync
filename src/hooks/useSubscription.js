import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { isAdminEmail } from '../lib/admin.js'

const TRIAL_DAYS = 7

function getTrialDaysLeft(createdAt) {
  if (!createdAt) return 0
  const msLeft = TRIAL_DAYS * 24 * 60 * 60 * 1000 - (Date.now() - new Date(createdAt).getTime())
  return Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)))
}

export function useSubscription(authUser) {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [subData, setSubData] = useState(null)
  const [subLoading, setSubLoading] = useState(true)
  const [isInTrial, setIsInTrial] = useState(false)
  const [trialDaysLeft, setTrialDaysLeft] = useState(0)

  const refetch = useCallback(async () => {
    if (!authUser) {
      setIsSubscribed(false)
      setSubData(null)
      setIsInTrial(false)
      setTrialDaysLeft(0)
      setSubLoading(false)
      return
    }

    setSubLoading(true)
    const { data } = await supabase
      .from('subscriptions')
      .select('status, current_period_end, stripe_customer_id, plan')
      .eq('user_id', authUser.id)
      .single()

    const hasActiveSub = data?.status === 'active' || data?.status === 'trialing'
    const daysLeft = getTrialDaysLeft(authUser.created_at)
    const inTrial = !hasActiveSub && daysLeft > 0

    setIsSubscribed(hasActiveSub || inTrial)
    setIsInTrial(inTrial)
    setTrialDaysLeft(daysLeft)
    setSubData(data || null)
    setSubLoading(false)
  }, [authUser])

  useEffect(() => {
    refetch()
  }, [refetch])

  // The owner gets full entitlement regardless of billing state. Decided here
  // so every consumer agrees: patching this in at individual gates previously
  // left the owner able to open paid tabs while wearables and companion memory
  // stayed hidden, because those read isSubscribed directly. Practitioner is
  // included so the owner can exercise every tier. Server-side checks are
  // unaffected — this only governs what the owner's own client renders.
  const isOwner = isAdminEmail(authUser?.email)

  const hasActivePlan = subData?.status === 'active' || subData?.status === 'trialing'
  const isPractitioner = isOwner || (hasActivePlan && subData?.plan === 'practitioner')
  // Rhythm ($7.97): full engine, no AI companion (voice or text). Trial users
  // are NOT rhythm — the 7-day trial shows everyone the full Healer experience.
  const isRhythm = !isOwner && hasActivePlan && subData?.plan === 'rhythm'

  return {
    isSubscribed: isSubscribed || isOwner,
    isPractitioner,
    isRhythm,
    isOwner,
    plan: isOwner ? (subData?.plan ?? 'owner') : (subData?.plan ?? null),
    subData,
    subLoading,
    refetch,
    isInTrial,
    trialDaysLeft,
  }
}
