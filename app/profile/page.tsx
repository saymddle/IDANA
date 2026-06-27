'use client'

import { useUser, useClerk } from '@clerk/nextjs'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface PublishedSession {
  id: string
  title: string
  goal?: string
  tags?: string[]
  created_at: string
}

export default function ProfilePage() {
  const { user, isLoaded } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()
  const [sessions, setSessions]       = useState<PublishedSession[]>([])
  const [signingOut, setSigningOut]   = useState(false)

  useEffect(() => {
    if (!isLoaded || !user) return
    fetch('/api/sessions')
      .then(r => r.json())
      .then(d => setSessions((d.sessions ?? []).filter((s: { published: boolean }) => s.published)))
      .catch(() => {})
  }, [isLoaded, user])

  const handleSignOut = async () => {
    setSigningOut(true)
    await signOut()
    router.push('/')
  }

  if (!isLoaded) {
    return (
      <div className="prof-loading">
        <div className="prof-spinner" />
        <style>{`.prof-loading{display:flex;align-items:center;justify-content:center;height:100vh}.prof-spinner{width:20px;height:20px;border:2px solid #C4B9A8;border-top-color:#8B5E3C;border-radius:50%;animation:ps 0.8s linear infinite}@keyframes ps{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (!user) return null

  const initials = user.fullName
    ? user.fullName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : user.primaryEmailAddress?.emailAddress?.[0]?.toUpperCase() ?? '?'

  const joinedDate = new Date(user.createdAt!).toLocaleDateString([], { year: 'numeric', month: 'long' })

  return (
    <div className="prof-root">
      <div className="prof-hero">
        <div className="prof-avatar">
          {user.imageUrl ? (
            <img src={user.imageUrl} alt="Avatar" className="prof-avatar-img" />
          ) : (
            <span className="prof-avatar-initials">{initials}</span>
          )}
        </div>
        <div className="prof-hero-info">
          <div className="prof-name-row">
            <h1 className="prof-name">{user.fullName || 'No name set'}</h1>
          </div>
          <p className="prof-email">{user.primaryEmailAddress?.emailAddress}</p>
          <p className="prof-joined">Member since {joinedDate}</p>
        </div>
      </div>

      <div className="prof-stats">
        <div className="prof-stat">
          <span className="prof-stat-value">{sessions.length}</span>
          <span className="prof-stat-label">Published</span>
        </div>
      </div>

      <div className="prof-section">
        <h2 className="prof-section-title">Published Sessions</h2>
        {sessions.length === 0 ? (
          <div className="prof-empty">
            <span className="prof-empty-icon">◈</span>
            <p className="prof-empty-text">No published sessions yet.</p>
            <button className="prof-empty-btn" onClick={() => router.push('/sessions')}>
              Go to Sessions
            </button>
          </div>
        ) : (
          <div className="prof-sessions">
            {sessions.map(session => (
              <div key={session.id} className="prof-session-card" onClick={() => router.push(`/explore/${session.id}`)}>
                <div className="prof-session-info">
                  <h3 className="prof-session-title">{session.title}</h3>
                  {session.goal && <p className="prof-session-goal">{session.goal}</p>}
                  {session.tags && session.tags.length > 0 && (
                    <div className="prof-session-tags">
                      {session.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="prof-session-tag">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="prof-session-meta">
                  <span className="prof-session-date">
                    {new Date(session.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                  <span className="prof-session-arrow">→</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="prof-section">
        <h2 className="prof-section-title">Account</h2>
        <div className="prof-actions">
          <button className="prof-signout-btn" onClick={handleSignOut} disabled={signingOut}>
            {signingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      </div>

      <style>{`
        .prof-root { padding: 40px 32px 80px; max-width: 640px; font-family: 'DM Sans', system-ui, sans-serif; }
        .prof-hero { display: flex; align-items: center; gap: 20px; margin-bottom: 28px; }
        .prof-avatar { width: 72px; height: 72px; border-radius: 50%; background: linear-gradient(135deg, #8B5E3C, #C89B3C); display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; border: 2px solid #C4B9A8; }
        .prof-avatar-img { width: 100%; height: 100%; object-fit: cover; }
        .prof-avatar-initials { font-size: 24px; font-weight: 700; color: #F2EBD9; font-family: 'Playfair Display', Georgia, serif; }
        .prof-hero-info { flex: 1; min-width: 0; }
        .prof-name-row { display: flex; align-items: center; gap: 10px; }
        .prof-name { font-family: 'Playfair Display', Georgia, serif; font-size: 22px; font-weight: 600; color: #1C1A17; margin: 0; }
        .prof-email { font-size: 13px; color: #9A8F80; margin: 4px 0 2px; }
        .prof-joined { font-size: 11px; color: #B0A090; margin: 0; }
        .prof-stats { display: flex; align-items: center; background: #FDFAF4; border: 1.5px solid #C4B9A8; border-radius: 14px; padding: 16px 24px; margin-bottom: 32px; }
        .prof-stat { display: flex; flex-direction: column; align-items: center; gap: 3px; flex: 1; }
        .prof-stat-value { font-family: 'Playfair Display', Georgia, serif; font-size: 22px; font-weight: 600; color: #1C1A17; }
        .prof-stat-label { font-size: 11px; color: #9A8F80; }
        .prof-section { margin-bottom: 32px; }
        .prof-section-title { font-family: 'Playfair Display', Georgia, serif; font-size: 16px; font-weight: 600; color: #1C1A17; margin: 0 0 14px; }
        .prof-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 40px 0; text-align: center; }
        .prof-empty-icon { font-size: 32px; color: #C4B9A8; }
        .prof-empty-text { font-size: 13px; color: #9A8F80; margin: 0; font-style: italic; }
        .prof-empty-btn { font-size: 12px; font-weight: 600; color: #F2EBD9; background: #1C1A17; border: none; border-radius: 8px; padding: 8px 14px; cursor: pointer; margin-top: 4px; font-family: 'DM Sans', system-ui, sans-serif; }
        .prof-sessions { display: flex; flex-direction: column; gap: 8px; }
        .prof-session-card { display: flex; align-items: center; gap: 12px; background: #FDFAF4; border: 1.5px solid #C4B9A8; border-radius: 12px; padding: 14px 16px; cursor: pointer; transition: all 0.15s; }
        .prof-session-card:hover { border-color: #8B5E3C; box-shadow: 0 4px 12px rgba(60,40,20,0.08); transform: translateY(-1px); }
        .prof-session-info { flex: 1; min-width: 0; }
        .prof-session-title { font-family: 'Playfair Display', Georgia, serif; font-size: 15px; font-weight: 600; color: #1C1A17; margin: 0 0 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .prof-session-goal { font-size: 12px; color: #6B5D50; margin: 0 0 5px; font-style: italic; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .prof-session-tags { display: flex; gap: 4px; flex-wrap: wrap; }
        .prof-session-tag { font-size: 10px; font-weight: 500; background: rgba(139,94,60,0.08); color: #8B5E3C; border-radius: 20px; padding: 2px 7px; }
        .prof-session-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
        .prof-session-date { font-size: 11px; color: #B0A090; }
        .prof-session-arrow { font-size: 14px; color: #C4B9A8; }
        .prof-session-card:hover .prof-session-arrow { color: #8B5E3C; }
        .prof-actions { display: flex; gap: 10px; }
        .prof-signout-btn { font-size: 13px; font-weight: 500; color: #C0394B; background: rgba(192,57,75,0.06); border: 1.5px solid rgba(192,57,75,0.2); border-radius: 10px; padding: 10px 18px; cursor: pointer; font-family: 'DM Sans', system-ui, sans-serif; transition: all 0.15s; }
        .prof-signout-btn:hover { background: rgba(192,57,75,0.12); border-color: #C0394B; }
        .prof-signout-btn:disabled { opacity: 0.6; cursor: wait; }
        @media (max-width: 600px) { .prof-root { padding: 24px 16px 80px; } .prof-hero { flex-direction: column; align-items: flex-start; gap: 14px; } }
      `}</style>
    </div>
  )
}
