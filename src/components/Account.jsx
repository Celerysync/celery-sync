import { useState } from 'react'
import C from '../lib/colors.js'
import { Card, Btn } from './ui.jsx'

const FEATURES = [
  { emoji: '🎙', label: 'Voice AI Healing Guide', desc: 'Speak to it, it speaks back — personalised to you and your books' },
  { emoji: '🌿', label: 'Complete Cleanse Protocols', desc: 'Every day of every cleanse with audio read-aloud' },
  { emoji: '🔍', label: 'Symptom Checker', desc: 'Exact supplements, dosages & causes from Anthony William\'s books' },
  { emoji: '📖', label: 'My Books — Upload & Learn', desc: 'Upload your MM PDFs, save videos, the AI learns your personal journey' },
  { emoji: '⏰', label: 'Adrenal Snack Reminders', desc: 'Never miss a 2-hour snack window — keeps blood sugar and adrenals stable' },
  { emoji: '🍎', label: 'What to Eat Right Now', desc: 'Time-aware food guidance from sunrise to bedtime' },
]

export default function Account({ authUser, isSubscribed, subData, subLoading, onSignOut, onReplayWelcome }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const subscribe = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: authUser.id, email: authUser.email }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      window.location.href = data.url
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  const openPortal = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: authUser.id }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      window.location.href = data.url
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  if (subLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 48, color: C.muted, fontFamily: 'Georgia,serif', fontSize: 15 }}>
        🌿 Loading your account…
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {!isSubscribed ? (
        <>
          {/* Pricing hero */}
          <div style={{
            background: `linear-gradient(135deg,${C.sageDark},${C.leaf})`,
            borderRadius: 22,
            padding: '28px 24px',
            color: C.white,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🌿</div>
            <div style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: 23, marginBottom: 6 }}>
              Healer Plan
            </div>
            <div style={{ fontSize: 32, fontFamily: 'Georgia,serif', fontWeight: 700 }}>
              $9.97
              <span style={{ fontSize: 15, fontWeight: 400, opacity: 0.85 }}>/month</span>
            </div>
            <div style={{
              marginTop: 10,
              background: 'rgba(255,255,255,0.18)',
              borderRadius: 30,
              padding: '6px 18px',
              display: 'inline-block',
              fontSize: 13,
              fontWeight: 700,
            }}>
              ✨ Try free for 7 days
            </div>
            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 8 }}>Cancel anytime · No lock-in</div>
          </div>

          {/* Features */}
          <Card>
            <div style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: 15, color: C.charcoal, marginBottom: 14 }}>
              Everything included:
            </div>
            {FEATURES.map(f => (
              <div key={f.label} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: `1px solid ${C.border}`, alignItems: 'flex-start' }}>
                <div style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{f.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: C.charcoal }}>{f.label}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>{f.desc}</div>
                </div>
                <div style={{ color: C.sage, fontSize: 15, alignSelf: 'center', flexShrink: 0, fontWeight: 700 }}>✓</div>
              </div>
            ))}
          </Card>

          {/* BYOB explanation */}
          <Card style={{ background: C.sageLight, border: `1px solid ${C.sage}40` }}>
            <div style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: 14, color: C.sageDark, marginBottom: 6 }}>
              📚 Bring Your Own Books
            </div>
            <div style={{ fontSize: 13, color: C.mid, lineHeight: 1.6 }}>
              CelerySync doesn't reproduce Anthony William's content — instead, you upload your
              own purchased MM books as PDFs. The AI reads <em>your</em> books and builds a
              healing guide personalised to what you own and have studied. This keeps his work
              protected while making the app more powerful the more books you add.
            </div>
          </Card>

          {error && (
            <div style={{ background: C.terracottaLight, border: `1px solid ${C.terracotta}50`, borderRadius: 12, padding: 12, fontSize: 13, color: C.terracotta }}>
              {error}
            </div>
          )}

          <button
            onClick={subscribe}
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px',
              background: loading ? C.muted : C.sageDark,
              color: C.white,
              border: 'none',
              borderRadius: 40,
              fontFamily: 'Georgia,serif',
              fontWeight: 700,
              fontSize: 17,
              cursor: loading ? 'default' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 24px #3D6B4450',
            }}
          >
            {loading ? '🌿 Please wait…' : 'Start My 7-Day Free Trial →'}
          </button>

          <div style={{ textAlign: 'center', fontSize: 11, color: C.muted, lineHeight: 1.7 }}>
            No charge during your trial. Cancel before day 7 and pay nothing.{'\n'}
            Secure payment powered by Stripe.
          </div>
        </>
      ) : (
        <>
          {/* Active subscription */}
          <div style={{
            background: `linear-gradient(135deg,${C.sageDark},${C.leaf})`,
            borderRadius: 22,
            padding: '24px 22px',
            color: C.white,
          }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>✨</div>
            <div style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: 20 }}>
              Healer Plan — Active
            </div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6, lineHeight: 1.5 }}>
              {subData?.status === 'trialing' ? '🎉 Free trial active' : '🌿 Subscription active'}
              {subData?.current_period_end && (
                <span>
                  {' '}· {subData.status === 'trialing' ? 'trial ends' : 'renews'}{' '}
                  {new Date(subData.current_period_end).toLocaleDateString('en-AU', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </span>
              )}
            </div>
          </div>

          <Card>
            <div style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: 14, color: C.charcoal, marginBottom: 6 }}>
              Account
            </div>
            <div style={{ fontSize: 13, color: C.mid, marginBottom: 14 }}>{authUser.email}</div>
            <Btn full onClick={openPortal} color={C.sage} disabled={loading}>
              {loading ? '🌿 Opening…' : 'Manage Billing & Subscription'}
            </Btn>
          </Card>
        </>
      )}

      {/* Sign out — always visible */}
      <Card>
        {!isSubscribed && (
          <div style={{ fontSize: 13, color: C.mid, marginBottom: 12 }}>
            Signed in as <strong>{authUser.email}</strong>
          </div>
        )}
        {onReplayWelcome && (
          <Btn full onClick={onReplayWelcome} color={C.sage} style={{ marginBottom: 10 }}>
            🎙 Replay Welcome Tour
          </Btn>
        )}
        <Btn full onClick={onSignOut} color={C.muted}>
          Sign Out
        </Btn>
      </Card>

      <div style={{ fontSize: 11, color: C.muted, textAlign: 'center', lineHeight: 1.7 }}>
        CelerySync is an independent tool, not affiliated with Anthony William or Medical Medium Inc.
        "Medical Medium" is a registered trademark of Anthony William, Inc.
      </div>
    </div>
  )
}
