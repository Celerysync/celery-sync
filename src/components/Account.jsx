import { useState, useEffect } from 'react'
import C from '../lib/colors.js'
import { Card, Btn } from './ui.jsx'
import { useLocalStorage } from '../hooks/useLocalStorage.js'
import WearableConnect from './WearableConnect.jsx'
import { supabase } from '../lib/supabase.js'

const LANGUAGES = [
  { code: "en", label: "English", native: "English" },
  { code: "es", label: "Spanish", native: "Español" },
  { code: "pt", label: "Portuguese", native: "Português" },
  { code: "fr", label: "French", native: "Français" },
  { code: "de", label: "German", native: "Deutsch" },
  { code: "it", label: "Italian", native: "Italiano" },
  { code: "nl", label: "Dutch", native: "Nederlands" },
  { code: "pl", label: "Polish", native: "Polski" },
  { code: "zh", label: "Chinese", native: "中文" },
  { code: "ja", label: "Japanese", native: "日本語" },
  { code: "ko", label: "Korean", native: "한국어" },
  { code: "ar", label: "Arabic", native: "العربية" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "ru", label: "Russian", native: "Русский" },
  { code: "tr", label: "Turkish", native: "Türkçe" },
];

function MemoryField({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: C.charcoal, lineHeight: 1.6, background: C.sageLight, borderRadius: 8, padding: "8px 10px" }}>
        {value}
      </div>
    </div>
  )
}

// Compliance (CLAUDE.md rails): descriptive app features only — the app is
// the engine for the user's OWN routine, never a source of protocol content
// or health-outcome claims.
const ENGINE_FEATURES = [
  { emoji: '🌿', label: 'Your Daily Rhythm', desc: 'Build your own routine from your own books — tap to complete, day by day' },
  { emoji: '🗓', label: 'Multi-day programs', desc: 'Set up cleanses and programs from your own copy of the books, tracked day by day' },
  { emoji: '📊', label: 'Check-ins, streaks & reports', desc: 'Log energy, mood and symptoms — see your own trends and streaks over time' },
  { emoji: '⏰', label: 'Reminders', desc: 'Gentle nudges for the routine and snack windows you set yourself' },
  { emoji: '💊', label: 'Supplement tracker', desc: 'Your own supplement list, ticked off daily, with restock notes' },
  { emoji: '💜', label: 'Carer mode', desc: 'A carer\'s view of the day for someone looking after you' },
  { emoji: '🔗', label: 'Official AW resources', desc: 'Direct links to Anthony William\'s books, YouTube, podcast, and website' },
]
const COMPANION_FEATURES = [
  { emoji: '🎙', label: 'Voice companion', desc: 'Say "just finished my juice" and it\'s ticked off — hands-free, anywhere in the app' },
  { emoji: '💬', label: 'AI chat that knows your journey', desc: 'Ask questions, think out loud, get pointed to the right official source' },
  { emoji: '🌅', label: 'Spoken mornings & evenings', desc: 'A good-morning with your rhythm, an evening reflection, and a Sunday week-in-review' },
  { emoji: '💓', label: 'Wearable integration', desc: 'Connect Oura Ring to log sleep & HRV alongside your check-ins automatically' },
]

export default function Account({ authUser, isSubscribed, isPractitioner, isRhythm, subData, subLoading, isInTrial, trialDaysLeft, onSignOut, onReplayWelcome, onRefetchSub, profileId }) {
  const [loading, setLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [error, setError] = useState(null)
  const [cancelPending, setCancelPending] = useState(subData?.cancel_at_period_end || false)
  const [memoryData, setMemoryData] = useState(null)
  const [memoryClearing, setMemoryClearing] = useState(false)
  const [memoryExpanded, setMemoryExpanded] = useState(false)

  useEffect(() => {
    if (!isSubscribed || !profileId) return
    supabase
      .from("healing_profiles")
      .select("healing_summary, hard_times, current_focus, wins, preferences, memory_updated_at")
      .eq("profile_id", profileId)
      .maybeSingle()
      .then(({ data }) => setMemoryData(data || null))
  }, [isSubscribed, profileId])
  const [lang, setLang] = useLocalStorage("cs_lang", "en")
  const [units, setUnits] = useLocalStorage("cs_units", "metric")
  const [caregiver, setCaregiver] = useLocalStorage("cs_caregiver", false)
  const [globalVoice, setGlobalVoice] = useLocalStorage("cs_globalVoice", true)
  const [darkMode, setDarkMode] = useLocalStorage("cs_darkMode", false)
  const [largeText, setLargeText] = useLocalStorage("cs_largeText", false)

  const subscribe = async (plan = 'healer') => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: authUser.id, email: authUser.email, plan }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      window.location.href = data.url
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  // Rhythm ↔ Healer switches update the live subscription in place (prorated)
  // — never a second checkout, which would double-bill.
  const changePlan = async (plan) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: authUser.id, plan }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      await onRefetchSub?.()
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
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
          {/* Choose-your-plan hero */}
          <div style={{
            background: `linear-gradient(135deg,${C.sageDark},${C.leaf})`,
            borderRadius: 22,
            padding: '26px 24px',
            color: C.white,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🌿</div>
            <div style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: 22, marginBottom: 6 }}>
              Choose how supported you want to be
            </div>
            <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.6 }}>
              Both plans are monthly — no lock-in, cancel anytime.
            </div>
          </div>

          {/* Healer plan (primary) */}
          <Card style={{ border: `2px solid ${C.sage}`, position: 'relative' }}>
            <div style={{
              position: 'absolute', top: -11, left: 18,
              background: C.sageDark, color: C.white, borderRadius: 20,
              padding: '3px 12px', fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
            }}>
              MOST LOVED
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4, marginBottom: 4 }}>
              <div style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: 17, color: C.charcoal }}>✨ Healer</div>
              <div style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: 20, color: C.sageDark, marginLeft: 'auto' }}>
                $24.97<span style={{ fontSize: 12, fontWeight: 400, color: C.muted }}>/mo AUD</span>
              </div>
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 8, lineHeight: 1.5 }}>
              Everything in Rhythm, plus the AI companion you met in your trial:
            </div>
            {COMPANION_FEATURES.map(f => (
              <div key={f.label} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: `1px solid ${C.border}`, alignItems: 'flex-start' }}>
                <div style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{f.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: C.charcoal }}>{f.label}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>{f.desc}</div>
                </div>
              </div>
            ))}
            <div style={{ fontSize: 11, color: C.muted, margin: '8px 0 10px' }}>
              Includes 100 voice minutes a month — top-ups available if you're chatty.
            </div>
            <button
              onClick={() => subscribe('healer')}
              disabled={loading}
              style={{
                width: '100%', padding: '14px',
                background: loading ? C.muted : C.sageDark, color: C.white,
                border: 'none', borderRadius: 40,
                fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: 15,
                cursor: loading ? 'default' : 'pointer',
              }}
            >
              {loading ? '🌿 Please wait…' : 'Subscribe to Healer →'}
            </button>
          </Card>

          {/* Rhythm plan */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
              <div style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: 17, color: C.charcoal }}>🌱 Rhythm</div>
              <div style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: 20, color: C.sageDark, marginLeft: 'auto' }}>
                $7.97<span style={{ fontSize: 12, fontWeight: 400, color: C.muted }}>/mo AUD</span>
              </div>
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 8, lineHeight: 1.5 }}>
              The full engine for your own routine — without the AI companion:
            </div>
            {ENGINE_FEATURES.map(f => (
              <div key={f.label} style={{ display: 'flex', gap: 10, padding: '7px 0', borderBottom: `1px solid ${C.border}`, alignItems: 'center' }}>
                <div style={{ fontSize: 16, flexShrink: 0 }}>{f.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 12.5, color: C.charcoal }}>{f.label}</div>
                  <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1, lineHeight: 1.4 }}>{f.desc}</div>
                </div>
                <div style={{ color: C.sage, fontSize: 14, flexShrink: 0, fontWeight: 700 }}>✓</div>
              </div>
            ))}
            <button
              onClick={() => subscribe('rhythm')}
              disabled={loading}
              style={{
                width: '100%', padding: '13px', marginTop: 10,
                background: 'transparent', color: C.sageDark,
                border: `2px solid ${C.sageDark}`, borderRadius: 40,
                fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: 14,
                cursor: loading ? 'default' : 'pointer',
              }}
            >
              {loading ? '🌿 Please wait…' : 'Subscribe to Rhythm →'}
            </button>
          </Card>

          {/* Source policy */}
          <Card style={{ background: C.sageLight, border: `1px solid ${C.sage}40` }}>
            <div style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: 14, color: C.sageDark, marginBottom: 6 }}>
              🔗 Always attributed. Always at the source.
            </div>
            <div style={{ fontSize: 13, color: C.mid, lineHeight: 1.6 }}>
              CelerySync paraphrases and attributes Anthony William's publicly shared teachings.
              For complete protocols, exact wording, and full healing plans, we always point you
              directly to his official books, YouTube, and podcast — the Resources tab links straight there.
              This app is not affiliated with or endorsed by Anthony William or Medical Medium LLC.
            </div>
          </Card>

          {error && (
            <div style={{ background: C.terracottaLight, border: `1px solid ${C.terracotta}50`, borderRadius: 12, padding: 12, fontSize: 13, color: C.terracotta }}>
              {error}
            </div>
          )}

          <div style={{ textAlign: 'center', fontSize: 11, color: C.muted, lineHeight: 1.7 }}>
            Billed when you subscribe. Cancel anytime — you keep access until the end of your billing period.{'\n'}
            Secure payment powered by Stripe.
          </div>

          <div style={{
            textAlign: 'center', fontSize: 11, color: C.muted,
            borderTop: `1px solid ${C.border}`, paddingTop: 12, lineHeight: 1.8,
          }}>
            If you're in crisis, please reach out:{' '}
            <a href="tel:131114" style={{ color: C.mid, fontWeight: 700 }}>Lifeline 13 11 14</a>
            {' · '}
            <a href="tel:1300224636" style={{ color: C.mid, fontWeight: 700 }}>Beyond Blue 1300 22 4636</a>
            {' · '}
            <a href="tel:000" style={{ color: C.mid, fontWeight: 700 }}>Emergency 000</a>
          </div>
        </>
      ) : isInTrial ? (
        <>
          {/* Free trial active */}
          <div style={{
            background: `linear-gradient(135deg,${C.sageDark},${C.leaf})`,
            borderRadius: 22,
            padding: '24px 22px',
            color: C.white,
          }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🌿</div>
            <div style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: 20 }}>
              Free Trial — Full Access
            </div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6, lineHeight: 1.5 }}>
              {trialDaysLeft > 1
                ? `🎉 ${trialDaysLeft} days remaining — everything is unlocked`
                : trialDaysLeft === 1
                ? '⏰ Last day of your free trial'
                : '⏰ Your trial ends today'}
            </div>
          </div>

          {trialDaysLeft <= 3 && (
            <div style={{
              background: C.goldLight, border: `1.5px solid ${C.gold}50`,
              borderRadius: 16, padding: '14px 16px',
            }}>
              <div style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: 14, color: C.charcoal, marginBottom: 4 }}>
                {trialDaysLeft === 0 ? 'Your trial ends today' : `${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} left`}
              </div>
              <div style={{ fontSize: 12, color: C.mid, lineHeight: 1.6, marginBottom: 12 }}>
                Keep everything you've been using — companion, rhythm, reports and all — or keep just the engine with the Rhythm plan.
              </div>
              <button
                onClick={() => subscribe('healer')}
                disabled={loading}
                style={{
                  width: '100%', padding: '13px', background: loading ? C.muted : C.sageDark,
                  color: C.white, border: 'none', borderRadius: 30,
                  fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: 15,
                  cursor: loading ? 'default' : 'pointer',
                }}
              >
                {loading ? '🌿 Please wait…' : 'Keep Everything — Healer $24.97/month →'}
              </button>
              <button
                onClick={() => subscribe('rhythm')}
                disabled={loading}
                style={{
                  width: '100%', padding: '11px', marginTop: 8,
                  background: 'transparent', color: C.sageDark,
                  border: `1.5px solid ${C.sageDark}60`, borderRadius: 30,
                  fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: 13,
                  cursor: loading ? 'default' : 'pointer',
                }}
              >
                {loading ? '🌿 Please wait…' : 'Just the engine — Rhythm $7.97/month →'}
              </button>
            </div>
          )}

          <Card>
            <div style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: 14, color: C.charcoal, marginBottom: 6 }}>
              Account
            </div>
            <div style={{ fontSize: 13, color: C.mid }}>{authUser.email}</div>
          </Card>
        </>
      ) : (
        <>
          {/* Active paid subscription */}
          <div style={{
            background: `linear-gradient(135deg,${C.sageDark},${C.leaf})`,
            borderRadius: 22,
            padding: '24px 22px',
            color: C.white,
          }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>{isPractitioner ? '🏥' : isRhythm ? '🌱' : '✨'}</div>
            <div style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: 20 }}>
              {isPractitioner ? 'Practitioner Plan — Active' : isRhythm ? 'Rhythm Plan — Active' : 'Healer Plan — Active'}
            </div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6, lineHeight: 1.5 }}>
              {cancelPending ? '⚠️ Cancelling at period end' : '🌿 Subscription active'}
              {subData?.current_period_end && (
                <span>
                  {' '}· {cancelPending ? 'access until' : 'renews'}{' '}
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

          {/* Cancel / Resume subscription */}
          <Card style={{ border: `1px solid ${cancelPending ? C.terracotta + '40' : C.border}`, background: cancelPending ? C.terracottaLight : C.white }}>
            {cancelPending ? (
              <>
                <div style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: 14, color: C.terracotta, marginBottom: 6 }}>
                  ⚠️ Subscription cancelling
                </div>
                <div style={{ fontSize: 13, color: C.mid, marginBottom: 14, lineHeight: 1.5 }}>
                  Your access continues until{' '}
                  <strong>{subData?.current_period_end ? new Date(subData.current_period_end).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : 'your renewal date'}</strong>.
                  Changed your mind? Resume anytime before then.
                </div>
                <Btn full onClick={async () => {
                  setCancelLoading(true)
                  setError(null)
                  try {
                    const res = await fetch('/api/stripe/resume', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: authUser.id }) })
                    const data = await res.json()
                    if (data.error) throw new Error(data.error)
                    setCancelPending(false)
                  } catch (err) { setError(err.message) }
                  setCancelLoading(false)
                }} color={C.sage} disabled={cancelLoading}>
                  {cancelLoading ? '🌿 Please wait…' : 'Resume My Subscription →'}
                </Btn>
              </>
            ) : (
              <>
                <div style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: 14, color: C.charcoal, marginBottom: 6 }}>
                  Cancel subscription
                </div>
                <div style={{ fontSize: 13, color: C.mid, marginBottom: 14, lineHeight: 1.5 }}>
                  You'll keep full access until the end of your current billing period. No charges after that.
                </div>
                <button onClick={async () => {
                  if (!confirm('Cancel your subscription? You keep access until your renewal date.')) return
                  setCancelLoading(true)
                  setError(null)
                  try {
                    const res = await fetch('/api/stripe/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: authUser.id }) })
                    const data = await res.json()
                    if (data.error) throw new Error(data.error)
                    setCancelPending(true)
                  } catch (err) { setError(err.message) }
                  setCancelLoading(false)
                }} disabled={cancelLoading} style={{
                  background: 'none', border: `1px solid ${C.border}`, borderRadius: 30,
                  padding: '9px 18px', fontSize: 13, color: C.muted,
                  cursor: cancelLoading ? 'default' : 'pointer', fontFamily: 'Georgia,serif',
                  touchAction: 'manipulation',
                }}>
                  {cancelLoading ? 'Please wait…' : 'Cancel subscription'}
                </button>
              </>
            )}
          </Card>

          {/* Plan switching — prorated in-place subscription update */}
          {isRhythm && (
            <Card style={{ border: `2px solid ${C.sage}` }}>
              <div style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: 15, color: C.charcoal, marginBottom: 6 }}>
                🎙 Add the companion
              </div>
              <div style={{ fontSize: 13, color: C.mid, lineHeight: 1.6, marginBottom: 12 }}>
                Upgrade to Healer for the voice and chat companion — talk your day through,
                tick things off by voice, and hear your mornings and evenings spoken. Applies
                to your current subscription straight away, prorated.
              </div>
              <Btn full onClick={() => changePlan('healer')} color={C.sage} disabled={loading}>
                {loading ? '🌿 Please wait…' : 'Upgrade to Healer — $24.97/month →'}
              </Btn>
            </Card>
          )}
          {!isPractitioner && !isRhythm && (
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => {
                  if (confirm('Switch to the Rhythm plan ($7.97/month)? You keep your whole routine, tracking and reports, but the voice and chat companion turns off straight away.')) changePlan('rhythm')
                }}
                disabled={loading}
                style={{
                  background: 'none', border: 'none', fontSize: 12, color: C.muted,
                  textDecoration: 'underline', cursor: 'pointer', fontFamily: 'Georgia,serif',
                }}
              >
                Need to trim costs? Switch to Rhythm — $7.97/month (keeps the engine, pauses the companion)
              </button>
            </div>
          )}

          {/* Practitioner upgrade */}
          {!isPractitioner && (
            <Card style={{ border: `1.5px solid ${C.gold}50`, background: C.goldLight }}>
              <div style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: 15, color: C.charcoal, marginBottom: 6 }}>
                🏥 Are you a practitioner?
              </div>
              <div style={{ fontSize: 13, color: C.mid, lineHeight: 1.6, marginBottom: 14 }}>
                Naturopath, health coach, kinesiologist, or MM guide? Upgrade to the Practitioner Plan for $99/month and get a full client management portal — descriptive session prep, session notes, and printable session summaries.
              </div>
              <Btn full onClick={async () => {
                // Everyone who sees this button already has an active
                // subscription — switch it in place (prorated) rather than
                // opening a second checkout, which would bill both plans.
                if (!confirm('Upgrade to the Practitioner plan ($99/month)? Your current subscription switches over straight away, prorated.')) return
                await changePlan('practitioner')
              }} color={C.gold} disabled={loading}>
                {loading ? '🌿 Please wait…' : 'Upgrade to Practitioner — $99/month →'}
              </Btn>
            </Card>
          )}
        </>
      )}

      {/* Wearable integration — subscribed users only */}
      {isSubscribed && <WearableConnect authUser={authUser} />}

      {/* Caregiver mode */}
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: 14, color: C.charcoal }}>
              💜 Caregiver Mode
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
              Switches the app to a carer's perspective — care prep dashboard, AI guidance addressed to you as the carer, and practical daily support for looking after a loved one doing Medical Medium healing.
            </div>
          </div>
          <button
            onClick={() => setCaregiver((v) => !v)}
            style={{
              width: 46, height: 26, borderRadius: 13, border: 'none',
              background: caregiver ? C.plum : '#d1d5db',
              cursor: 'pointer', position: 'relative', flexShrink: 0,
              transition: 'background 0.2s',
            }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: '50%', background: '#fff',
              position: 'absolute', top: 3,
              left: caregiver ? 23 : 3,
              transition: 'left 0.2s',
              boxShadow: '0 1px 4px #00000030',
            }} />
          </button>
        </div>
        {caregiver && (
          <div style={{ marginTop: 10, fontSize: 12, color: C.plum, fontWeight: 700 }}>
            💜 Caregiver Mode is active — the Today tab and AI Guide are now in carer mode
          </div>
        )}
      </Card>

      {/* Language */}
      <Card>
        <div style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: 14, color: C.charcoal, marginBottom: 10 }}>
          🌍 Language
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, lineHeight: 1.5 }}>
          The AI Guide will respond in your chosen language. More languages available — ask the AI Guide to switch.
        </div>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 10,
            border: `1.5px solid ${C.border}`, fontFamily: 'Georgia,serif',
            fontSize: 14, color: C.charcoal, background: C.white, outline: 'none',
          }}
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.native} — {l.label}
            </option>
          ))}
        </select>
        {lang !== 'en' && (
          <div style={{ marginTop: 8, fontSize: 12, color: C.sage }}>
            ✓ AI Guide will respond in {LANGUAGES.find(l => l.code === lang)?.label}
          </div>
        )}
      </Card>

      {/* Measurement units */}
      <Card>
        <div style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: 14, color: C.charcoal, marginBottom: 10 }}>
          📏 Measurement Units
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 12, lineHeight: 1.5 }}>
          The AI Guide and voice will use your preferred units for all dosages and quantities.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { val: 'metric', label: '🌏 Metric', sub: 'mL, litres, grams' },
            { val: 'imperial', label: '🇺🇸 Imperial', sub: 'oz, cups, lbs' },
          ].map(opt => (
            <button
              key={opt.val}
              onClick={() => setUnits(opt.val)}
              style={{
                flex: 1, padding: '12px 10px', borderRadius: 12,
                border: `2px solid ${units === opt.val ? C.sage : C.border}`,
                background: units === opt.val ? C.sageLight : C.white,
                cursor: 'pointer', touchAction: 'manipulation',
              }}
            >
              <div style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: 13, color: units === opt.val ? C.sageDark : C.charcoal }}>
                {opt.label}
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{opt.sub}</div>
            </button>
          ))}
        </div>
        {units === 'metric' && (
          <div style={{ marginTop: 8, fontSize: 12, color: C.sage }}>
            ✓ "500ml of celery juice" · "half a litre" · "milligrams"
          </div>
        )}
      </Card>

      {/* Global voice toggle */}
      <Card>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.sageDark, marginBottom: 4 }}>
          🎙 Voice on Every Page
        </div>
        <div style={{ fontSize: 13, color: C.mid, marginBottom: 12 }}>
          A floating mic button lets you ask the AI Guide anything from any page, and the companion briefly introduces each tab the first time you visit it each session.
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn
            full
            onClick={() => setGlobalVoice(true)}
            color={globalVoice ? C.sage : C.muted}
            style={{ opacity: globalVoice ? 1 : 0.6 }}
          >
            🎙 On
          </Btn>
          <Btn
            full
            onClick={() => setGlobalVoice(false)}
            color={!globalVoice ? C.sageDark : C.muted}
            style={{ opacity: !globalVoice ? 1 : 0.6 }}
          >
            Off
          </Btn>
        </div>
      </Card>

      {/* Eye comfort / dark mode */}
      <Card>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.sageDark, marginBottom: 4 }}>
          🌙 Eye Comfort Mode
        </div>
        <div style={{ fontSize: 13, color: C.mid, marginBottom: 12 }}>
          Dims the screen and reduces blue light — ideal for photosensitivity, migraines, or evening use.
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn full onClick={() => { setDarkMode(false); document.documentElement.setAttribute("data-dark","false"); }} color={!darkMode ? C.sage : C.muted} style={{ opacity: !darkMode ? 1 : 0.6 }}>☀️ Normal</Btn>
          <Btn full onClick={() => { setDarkMode(true); document.documentElement.setAttribute("data-dark","true"); }} color={darkMode ? C.sageDark : C.muted} style={{ opacity: darkMode ? 1 : 0.6 }}>🌙 Dim</Btn>
        </div>
      </Card>

      {/* Large text */}
      <Card>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.sageDark, marginBottom: 4 }}>
          🔤 Text Size
        </div>
        <div style={{ fontSize: 13, color: C.mid, marginBottom: 12 }}>
          Larger text helps with brain fog and visual fatigue — everything scales up by 25%.
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn full onClick={() => { setLargeText(false); document.documentElement.setAttribute("data-large","false"); }} color={!largeText ? C.sage : C.muted} style={{ opacity: !largeText ? 1 : 0.6 }}>A Normal</Btn>
          <Btn full onClick={() => { setLargeText(true); document.documentElement.setAttribute("data-large","true"); }} color={largeText ? C.sageDark : C.muted} style={{ opacity: largeText ? 1 : 0.6 }}>A+ Large</Btn>
        </div>
      </Card>

      {/* Companion memory — subscribed users only */}
      {isSubscribed && profileId && (
        <Card>
          <div
            onClick={() => setMemoryExpanded(v => !v)}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
          >
            <div>
              <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal }}>
                🧠 What the companion remembers
              </div>
              {memoryData?.memory_updated_at && (
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                  Last updated {new Date(memoryData.memory_updated_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                </div>
              )}
            </div>
            <div style={{ fontSize: 16, color: C.muted, userSelect: "none" }}>{memoryExpanded ? "▲" : "▼"}</div>
          </div>

          {memoryExpanded && (
            <div style={{ marginTop: 14 }}>
              {!memoryData || (!memoryData.healing_summary && !memoryData.hard_times && !memoryData.current_focus && !memoryData.wins) ? (
                <div style={{ fontSize: 13, color: C.muted, fontStyle: "italic", lineHeight: 1.6 }}>
                  No memory yet — it builds up naturally as you chat with the companion.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {memoryData.healing_summary && (
                    <MemoryField label="Summary" value={memoryData.healing_summary} />
                  )}
                  {memoryData.current_focus && (
                    <MemoryField label="Current focus" value={memoryData.current_focus} />
                  )}
                  {memoryData.hard_times && (
                    <MemoryField label="Hard times" value={memoryData.hard_times} />
                  )}
                  {memoryData.wins && (
                    <MemoryField label="Recent wins" value={memoryData.wins} />
                  )}
                  {(memoryData.preferences?.prefers?.length > 0 || memoryData.preferences?.avoids?.length > 0) && (
                    <MemoryField
                      label="Preferences"
                      value={[
                        memoryData.preferences?.prefers?.length ? `Prefers: ${memoryData.preferences.prefers.join(", ")}` : null,
                        memoryData.preferences?.avoids?.length ? `Avoids: ${memoryData.preferences.avoids.join(", ")}` : null,
                      ].filter(Boolean).join(" · ")}
                    />
                  )}
                </div>
              )}

              <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, lineHeight: 1.5 }}>
                  The companion builds this automatically from your conversations. Clear it to start fresh — this cannot be undone.
                </div>
                <button
                  disabled={memoryClearing}
                  onClick={async () => {
                    if (!confirm("Clear all companion memory? This cannot be undone.")) return
                    setMemoryClearing(true)
                    try {
                      await Promise.all([
                        supabase.from("conversations").delete().eq("profile_id", profileId),
                        supabase.from("healing_profiles").delete().eq("profile_id", profileId),
                        supabase.from("healing_milestones").delete().eq("profile_id", profileId),
                      ])
                      setMemoryData(null)
                    } catch (e) {
                      console.warn("Clear memory:", e.message)
                    }
                    setMemoryClearing(false)
                  }}
                  style={{
                    background: "none", border: `1px solid ${C.border}`, borderRadius: 30,
                    padding: "8px 16px", fontSize: 12, color: C.muted,
                    cursor: memoryClearing ? "default" : "pointer", fontFamily: "Georgia,serif",
                    touchAction: "manipulation",
                  }}
                >
                  {memoryClearing ? "Clearing…" : "Clear companion memory"}
                </button>
              </div>
            </div>
          )}
        </Card>
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

      <div style={{
        background: "#f9f9f7",
        border: `1px solid ${C.border}`,
        borderRadius: 16, padding: "14px 16px",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: C.charcoal, marginBottom: 5, fontFamily: "Georgia,serif" }}>
          Independent App — Not Affiliated with Anthony William
        </div>
        <div style={{ fontSize: 11, color: C.mid, lineHeight: 1.75 }}>
          CelerySync is an independent app created by a Medical Medium community member. It is not affiliated with, endorsed by, or connected to Anthony William or Medical Medium LLC. "Medical Medium" is a registered trademark of Anthony William, Inc. All content is for educational and personal reference only — not a substitute for medical advice.
        </div>
      </div>
    </div>
  )
}
