import { useCallback } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

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
