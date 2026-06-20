import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

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

  const isPractitioner = (subData?.status === 'active' || subData?.status === 'trialing') && subData?.plan === 'practitioner'

  return { isSubscribed, isPractitioner, subData, subLoading, refetch, isInTrial, trialDaysLeft }
}
