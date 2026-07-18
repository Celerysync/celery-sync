import { useState } from 'react'
import C from '../lib/colors.js'
import { supabase } from '../lib/supabase.js'
import Landing from './Landing.jsx'

export default function Auth() {
  const [showAuth, setShowAuth] = useState(false)
  const [mode, setMode] = useState('signup') // start on signup for new visitors
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)

  const submit = async () => {
    if (!email.trim()) return setMsg({ ok: false, text: 'Please enter your email address.' })
    setLoading(true)
    setMsg(null)

    try {
      if (mode === 'signup') {
        if (password.length < 6) throw new Error('Password must be at least 6 characters.')
        const { error } = await supabase.auth.signUp({ email: email.trim(), password })
        if (error) throw error
        setMsg({ ok: true, text: 'Account created! Check your email to confirm it, then sign in.' })
      } else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim())
        if (error) throw error
        setMsg({ ok: true, text: 'Password reset email sent — check your inbox.' })
      }
    } catch (err) {
      setMsg({ ok: false, text: err.message })
    }
    setLoading(false)
  }

  if (!showAuth) {
    return <Landing onGetStarted={() => setShowAuth(true)} />
  }

  const inputStyle = {
    width: '100%',
    padding: '13px 16px',
    borderRadius: 14,
    border: `1.5px solid ${C.border}`,
    fontFamily: 'Georgia,serif',
    fontSize: 15,
    outline: 'none',
    background: C.mist,
    boxSizing: 'border-box',
    color: C.charcoal,
  }

  const linkBtn = {
    background: 'none',
    border: 'none',
    color: C.sageDark,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'Georgia,serif',
    fontSize: 13,
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: `linear-gradient(160deg,${C.sageDark} 0%,${C.leaf} 100%)`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Back to landing */}
        <button
          onClick={() => setShowAuth(false)}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontFamily: 'Georgia,serif', fontSize: 13, marginBottom: 16 }}
        >
          ← Back
        </button>

        {/* Branding */}
        <div style={{ textAlign: 'center', marginBottom: 28, color: C.white }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>🌿</div>
          <div style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: 28 }}>CelerySync</div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6, lineHeight: 1.5 }}>
            Your personal Medical Medium healing companion
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.97)',
          borderRadius: 24,
          padding: 28,
          boxShadow: '0 20px 60px #00000030',
        }}>
          <div style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: 20, color: C.charcoal, marginBottom: 20 }}>
            {mode === 'login' ? 'Welcome back 🌿' : mode === 'signup' ? 'Begin your healing journey' : 'Reset your password'}
          </div>

          {msg && (
            <div style={{
              background: msg.ok ? C.sageLight : C.terracottaLight,
              border: `1px solid ${msg.ok ? C.sage : C.terracotta}60`,
              borderRadius: 12,
              padding: '11px 14px',
              fontSize: 13,
              color: msg.ok ? C.sageDark : C.terracotta,
              marginBottom: 16,
              lineHeight: 1.5,
            }}>
              {msg.text}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && mode !== 'reset' && submit()}
              style={inputStyle}
              autoComplete="email"
            />
            {mode !== 'reset' && (
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()}
                style={inputStyle}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
            )}
          </div>

          <button
            onClick={submit}
            disabled={loading}
            style={{
              width: '100%',
              marginTop: 18,
              padding: '14px',
              background: loading ? C.muted : C.sageDark,
              color: C.white,
              border: 'none',
              borderRadius: 40,
              fontFamily: 'Georgia,serif',
              fontWeight: 700,
              fontSize: 16,
              cursor: loading ? 'default' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 20px #3D6B4440',
            }}
          >
            {loading
              ? '🌿 Please wait…'
              : mode === 'login'
              ? 'Sign In'
              : mode === 'signup'
              ? 'Create Account — 7 Days Free'
              : 'Send Reset Email'}
          </button>

          <div style={{ marginTop: 20, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {mode === 'signup' && (
              <>
                <span style={{ fontSize: 13, color: C.mid }}>
                  Already have an account?{' '}
                  <button style={linkBtn} onClick={() => { setMode('login'); setMsg(null) }}>
                    Sign in
                  </button>
                </span>
                <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6 }}>
                  Try free for 7 days, then $24.97/month. Cancel anytime.
                </div>
              </>
            )}
            {mode === 'login' && (
              <>
                <span style={{ fontSize: 13, color: C.mid }}>
                  New here?{' '}
                  <button style={linkBtn} onClick={() => { setMode('signup'); setMsg(null) }}>
                    Create account
                  </button>
                </span>
                <button
                  style={{ ...linkBtn, color: C.muted, fontSize: 12 }}
                  onClick={() => { setMode('reset'); setMsg(null) }}
                >
                  Forgot password?
                </button>
              </>
            )}
            {mode === 'reset' && (
              <button style={linkBtn} onClick={() => { setMode('login'); setMsg(null) }}>
                ← Back to sign in
              </button>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>
          CelerySync is an independent companion tool, not affiliated with{'\n'}Anthony William or Medical Medium Inc.
        </div>
      </div>
    </div>
  )
}
