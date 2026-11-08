import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

export function useAuth() {
  const [authUser, setAuthUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthUser(session?.user ?? null)
      setAuthLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = () => {
    // The phone's copy of their recipes (kept for offline use) goes with them.
    try {
      Object.keys(localStorage).filter((k) => k.startsWith("cs_kitchen_")).forEach((k) => localStorage.removeItem(k))
    } catch { /* storage blocked */ }
    return supabase.auth.signOut()
  }

  return { authUser, authLoading, signOut }
}
