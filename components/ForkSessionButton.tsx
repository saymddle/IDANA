'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ForkSessionButtonProps {
  sessionId: string
  sessionTitle: string
}

export default function ForkSessionButton({ sessionId, sessionTitle }: ForkSessionButtonProps) {
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'forking' | 'done' | 'error'>('idle')

  const handleFork = async () => {
    setStatus('forking')
    try {
      const res = await fetch(`/api/sessions/${sessionId}/fork`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `${sessionTitle} (fork)` }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setStatus('done')
      setTimeout(() => router.push(`/sessions/${data.session.id}`), 800)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 2000)
    }
  }

  return (
    <button
      className={`fork-btn fork-btn--${status}`}
      onClick={handleFork}
      disabled={status === 'forking' || status === 'done'}
    >
      {status === 'idle'    && <><span className="fork-icon">⎇</span> Fork Session</>}
      {status === 'forking' && <><span className="fork-spinner" /> Forking...</>}
      {status === 'done'    && <><span className="fork-check">✓</span> Forked — opening</>}
      {status === 'error'   && <>Failed — try again</>}

      <style>{`
        .fork-btn {
          display: inline-flex; align-items: center; gap: 7px;
          font-size: 13px; font-weight: 600;
          font-family: 'DM Sans', system-ui, sans-serif;
          padding: 9px 18px; border-radius: 10px;
          border: none; cursor: pointer;
          transition: all 0.15s;
        }
        .fork-btn--idle { background: #1C1A17; color: #F2EBD9; }
        .fork-btn--idle:hover { background: #3D2B1F; }
        .fork-btn--forking { background: #3D2B1F; color: #C4B9A8; cursor: wait; }
        .fork-btn--done { background: #5A7A4A; color: #F2EBD9; cursor: default; }
        .fork-btn--error {
          background: rgba(192,57,75,0.1); color: #C0394B;
          border: 1px solid rgba(192,57,75,0.3);
        }
        .fork-icon { font-size: 15px; line-height: 1; }
        .fork-check { font-size: 14px; }
        .fork-spinner {
          width: 12px; height: 12px;
          border: 2px solid rgba(242,235,217,0.3);
          border-top-color: #F2EBD9;
          border-radius: 50%;
          animation: fork-spin 0.7s linear infinite;
          flex-shrink: 0;
        }
        @keyframes fork-spin { to { transform: rotate(360deg) } }
      `}</style>
    </button>
  )
}
