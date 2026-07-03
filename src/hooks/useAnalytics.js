import { useCallback } from 'react'

import { API_URL as API } from '../lib/env.js'

export function useAnalytics(authUser) {
  const track = useCallback((eventType, properties = {}) => {
    // Fire-and-forget — never block the UI
    fetch(`${API}/api/analytics/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: authUser?.id || null, eventType, properties }),
    }).catch(() => {})
  }, [authUser?.id])

  return { track }
}
