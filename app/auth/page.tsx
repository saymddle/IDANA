'use client'

import { SignIn } from '@clerk/nextjs'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function AuthForm() {
  const searchParams = useSearchParams()
  // Clerk passes redirect_url; fall back to next for any lingering old links
  const redirectUrl = searchParams.get('redirect_url') || searchParams.get('next') || '/'

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
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
      <SignIn routing="hash" fallbackRedirectUrl={redirectUrl} />
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  )
}
