import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

export function useSubscription(authUser) {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [subData, setSubData] = useState(null)
  const [subLoading, setSubLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!authUser) {
      setIsSubscribed(false)
      setSubData(null)
      setSubLoading(false)
      return
    }

    setSubLoading(true)
    const { data } = await supabase
      .from('subscriptions')
      .select('status, current_period_end, stripe_customer_id, plan')
      .eq('user_id', authUser.id)
      .single()

    const active = data?.status === 'active' || data?.status === 'trialing'
    setIsSubscribed(active)
    setSubData(data || null)
    setSubLoading(false)
  }, [authUser])

  useEffect(() => {
    refetch()
  }, [refetch])

  const isPractitioner = (subData?.status === 'active' || subData?.status === 'trialing') && subData?.plan === 'practitioner'

  return { isSubscribed, isPractitioner, subData, subLoading, refetch }
}
