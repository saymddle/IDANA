'use client'

// app/auth/page.tsx
// Login page — email/password and magic link.
// Redirects to ?next= param or / after successful auth.
// Uses the BROWSER supabase client (lib/supabase.ts) — correct for client components.

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Mode = 'magic' | 'password'
type PasswordStep = 'login' | 'signup'

export default function AuthPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  )
}

function AuthForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const next         = searchParams.get('next') || '/'

  const [mode, setMode]           = useState<Mode>('magic')
  const [step, setStep]           = useState<PasswordStep>('login')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [loading, setLoading]     = useState(false)
  const [sent, setSent]           = useState(false)
  const [error, setError]         = useState<string | null>(null)

  // If already logged in, skip to destination
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace(next)
    })
  }, [])

  // Listen for magic link callback
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) router.replace(next)
    })
    return () => subscription.unsubscribe()
  }, [next])

  async function handleMagicLink() {
    if (!email.trim()) return
    setLoading(true); setError(null)
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}${next}` },
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    setSent(true)
  }

  async function handlePassword() {
    if (!email.trim() || !password) return
    setLoading(true); setError(null)

    const { error: err } = step === 'login'
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({ email: email.trim(), password })

    setLoading(false)
    if (err) { setError(err.message); return }
    if (step === 'signup') {
      setError(null)
      setSent(true) // show "check email to confirm" message
    }
    // login success handled by onAuthStateChange above
  }

  const handleSubmit = mode === 'magic' ? handleMagicLink : handlePassword

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo / wordmark */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <p style={{
            fontFamily: 'var(--serif)',
            fontSize: 32,
            fontWeight: 400,
            color: 'var(--ink)',
            letterSpacing: '0.04em',
            margin: 0,
          }}>
            IDANA
          </p>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            culinary R&D
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--line)',
          borderRadius: 20,
          padding: '32px 28px',
          boxShadow: 'var(--shadow-1)',
        }}>

          {sent ? (
            // — Sent confirmation ————————————————————————————————————————————
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ fontSize: 36, marginBottom: 16 }}>📬</div>
              <h2 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 400, color: 'var(--ink)', marginBottom: 8 }}>
                {step === 'signup' ? 'Confirm your email' : 'Check your inbox'}
              </h2>
              <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6 }}>
                {step === 'signup'
                  ? `We sent a confirmation link to ${email}. Click it to activate your account.`
                  : `We sent a magic link to ${email}. Click it to sign in — no password needed.`
                }
              </p>
              <button
                onClick={() => { setSent(false); setError(null) }}
                style={{ marginTop: 20, fontSize: 13, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              {/* — Mode toggle ————————————————————————————————————————————— */}
              <div style={{
                display: 'flex', gap: 4,
                background: 'var(--bg-deep)',
                borderRadius: 12, padding: 4,
                marginBottom: 28,
              }}>
                {(['magic', 'password'] as Mode[]).map(m => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); setError(null) }}
                    style={{
                      flex: 1, padding: '8px 0',
                      borderRadius: 9, border: 'none',
                      background: mode === m ? 'var(--card)' : 'transparent',
                      color: mode === m ? 'var(--ink)' : 'var(--muted)',
                      fontSize: 13, fontWeight: mode === m ? 600 : 400,
                      fontFamily: 'inherit', cursor: 'pointer',
                      boxShadow: mode === m ? 'var(--shadow-1)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {m === 'magic' ? 'Magic link' : 'Password'}
                  </button>
                ))}
              </div>

              {/* — Email field ——————————————————————————————————————————————— */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: 7 }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder="you@example.com"
                  autoComplete="email"
                  style={{
                    width: '100%', padding: '11px 14px',
                    borderRadius: 12, border: '1px solid var(--line)',
                    background: 'var(--bg)', color: 'var(--ink)',
                    fontSize: 15, fontFamily: 'inherit',
                    outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'var(--green)')}
                  onBlur={e  => (e.target.style.borderColor = 'var(--line)')}
                />
              </div>

              {/* — Password field (password mode only) ———————————————————— */}
              {mode === 'password' && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: 7 }}>
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    placeholder={step === 'signup' ? 'Create a password' : 'Your password'}
                    autoComplete={step === 'signup' ? 'new-password' : 'current-password'}
                    style={{
                      width: '100%', padding: '11px 14px',
                      borderRadius: 12, border: '1px solid var(--line)',
                      background: 'var(--bg)', color: 'var(--ink)',
                      fontSize: 15, fontFamily: 'inherit',
                      outline: 'none', boxSizing: 'border-box',
                      transition: 'border-color 0.15s',
                    }}
                    onFocus={e => (e.target.style.borderColor = 'var(--green)')}
                    onBlur={e  => (e.target.style.borderColor = 'var(--line)')}
                  />
                </div>
              )}

              {/* — Error ————————————————————————————————————————————————————— */}
              {error && (
                <p style={{ fontSize: 13, color: 'var(--coral, #C0503A)', marginBottom: 14, lineHeight: 1.4 }}>
                  {error}
                </p>
              )}

              {/* — Submit ——————————————————————————————————————————————————— */}
              <button
                onClick={handleSubmit}
                disabled={loading || !email.trim() || (mode === 'password' && !password)}
                style={{
                  width: '100%', padding: '13px 0',
                  borderRadius: 14, border: 'none',
                  background: loading || !email.trim() ? 'var(--line)' : 'var(--green)',
                  color: '#FBF7F0',
                  fontSize: 15, fontWeight: 600, fontFamily: 'inherit',
                  cursor: loading || !email.trim() ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s',
                  marginBottom: mode === 'password' ? 14 : 0,
                }}
              >
                {loading
                  ? 'Please wait...'
                  : mode === 'magic'
                    ? 'Send magic link'
                    : step === 'login' ? 'Sign in' : 'Create account'
                }
              </button>

              {/* — Login / signup toggle (password mode) ———————————————————— */}
              {mode === 'password' && (
                <button
                  onClick={() => { setStep(s => s === 'login' ? 'signup' : 'login'); setError(null) }}
                  style={{ width: '100%', fontSize: 13, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center' }}
                >
                  {step === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
