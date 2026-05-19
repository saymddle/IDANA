'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import SessionCanvas from '@/components/canvas/SessionCanvas'

export default function SessionPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id as string
  const [title, setTitle] = useState('Untitled Session')
  const [forkedFrom, setForkedFrom] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}`)
      .then(r => r.json())
      .then(json => {
        if (json.session) {
          setTitle(json.session.title || 'Untitled Session')
          setForkedFrom(json.session.forked_from ?? null)
        }
      })
      .catch(() => {})
  }, [sessionId])

  async function handleTitleChange(newTitle: string) {
    setTitle(newTitle)
    await fetch(`/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle }),
    })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column' }}>
      {forkedFrom && (
        <div className="sfb-banner">
          <span>⎇</span>
          Forked from a published session —
          <button onClick={() => router.push(`/explore/${forkedFrom}`)}>
            View original
          </button>
        </div>
      )}
      <SessionCanvas
        sessionId={sessionId}
        sessionTitle={title}
        onTitleChange={handleTitleChange}
        onBack={() => router.push('/sessions')}
      />
      <style>{`
        .sfb-banner {
          display: flex; align-items: center; gap: 8px;
          padding: 7px 16px;
          background: rgba(200,155,60,0.08);
          border-bottom: 1px solid rgba(200,155,60,0.2);
          font-size: 12px; color: #6B5D50;
          font-family: 'DM Sans', system-ui, sans-serif;
          flex-shrink: 0; z-index: 10;
        }
        .sfb-banner button {
          color: #C89B3C; font-weight: 600; background: none;
          border: none; cursor: pointer; padding: 0; font-size: 12px;
          font-family: inherit; text-decoration: underline;
        }
      `}</style>
    </div>
  )
}
