import { useState } from 'react'
import C from '../lib/colors.js'
import { Card, Btn } from './ui.jsx'
import { useLocalStorage } from '../hooks/useLocalStorage.js'
import WearableConnect from './WearableConnect.jsx'

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

const FEATURES = [
  { emoji: '🎙', label: 'Voice AI Healing Guide', desc: 'Speak to it, it speaks back — personalised to you and your books' },
  { emoji: '🌿', label: 'Complete Cleanse Protocols', desc: 'Every day of every cleanse with audio read-aloud' },
  { emoji: '🔍', label: 'Symptom Checker', desc: 'Exact supplements, dosages & causes from Anthony William\'s books' },
  { emoji: '📖', label: 'My Books — Upload & Learn', desc: 'Upload your MM PDFs, save videos, the AI learns your personal journey' },
  { emoji: '💓', label: 'Wearable Integration', desc: 'Connect Oura Ring for automatic sleep & HRV data — interpreted through Anthony William\'s teachings' },
  { emoji: '⏰', label: 'Adrenal Snack Reminders', desc: 'Never miss a 2-hour snack window — keeps blood sugar and adrenals stable' },
  { emoji: '🍎', label: 'What to Eat Right Now', desc: 'Time-aware food guidance from sunrise to bedtime' },
]

export default function Account({ authUser, isSubscribed, isPractitioner, subData, subLoading, isInTrial, trialDaysLeft, onSignOut, onReplayWelcome }) {
  const [loading, setLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [error, setError] = useState(null)
  const [cancelPending, setCancelPending] = useState(subData?.cancel_at_period_end || false)
  const [lang, setLang] = useLocalStorage("cs_lang", "en")
  const [units, setUnits] = useLocalStorage("cs_units", "metric")
  const [caregiver, setCaregiver] = useLocalStorage("cs_caregiver", false)
  const [globalVoice, setGlobalVoice] = useLocalStorage("cs_globalVoice", true)
  const [darkMode, setDarkMode] = useLocalStorage("cs_darkMode", false)
  const [largeText, setLargeText] = useLocalStorage("cs_largeText", false)

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
              $14.97
              <span style={{ fontSize: 15, fontWeight: 400, opacity: 0.85 }}>/month AUD</span>
            </div>
            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4, marginBottom: 8 }}>
              or $119/year — save $61
            </div>
            <div style={{
              marginTop: 6,
              background: 'rgba(255,255,255,0.18)',
              borderRadius: 30,
              padding: '6px 18px',
              display: 'inline-block',
              fontSize: 13,
              fontWeight: 700,
            }}>
              ✨ Try free for 7 days
            </div>
            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 8 }}>Powered by the world's most advanced AI · Cancel anytime</div>
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
                Subscribe now to keep full access to your AI Guide, healing memory, weekly summaries, and everything else.
              </div>
              <button
                onClick={subscribe}
                disabled={loading}
                style={{
                  width: '100%', padding: '13px', background: loading ? C.muted : C.sageDark,
                  color: C.white, border: 'none', borderRadius: 30,
                  fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: 15,
                  cursor: loading ? 'default' : 'pointer',
                }}
              >
                {loading ? '🌿 Please wait…' : 'Subscribe — $14.97/month →'}
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
            <div style={{ fontSize: 36, marginBottom: 10 }}>{isPractitioner ? '🏥' : '✨'}</div>
            <div style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: 20 }}>
              {isPractitioner ? 'Practitioner Plan — Active' : 'Healer Plan — Active'}
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

          {/* Practitioner upgrade */}
          {!isPractitioner && (
            <Card style={{ border: `1.5px solid ${C.gold}50`, background: C.goldLight }}>
              <div style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: 15, color: C.charcoal, marginBottom: 6 }}>
                🏥 Are you a practitioner?
              </div>
              <div style={{ fontSize: 13, color: C.mid, lineHeight: 1.6, marginBottom: 14 }}>
                Naturopath, health coach, kinesiologist, or MM guide? Upgrade to the Practitioner Plan for $79/month and get a full client management portal — AI protocol generation, session notes, and printable healing plans.
              </div>
              <Btn full onClick={async () => {
                setLoading(true)
                try {
                  const res = await fetch('/api/stripe/checkout/practitioner', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: authUser.id, email: authUser.email }) })
                  const data = await res.json()
                  if (data.error) throw new Error(data.error)
                  window.location.href = data.url
                } catch (err) { setError(err.message); setLoading(false) }
              }} color={C.gold} disabled={loading}>
                {loading ? '🌿 Please wait…' : 'Upgrade to Practitioner — $79/month →'}
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
          A floating mic button lets you ask the AI Guide anything from any page — Symptoms, Recipes, Body, wherever you are.
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
