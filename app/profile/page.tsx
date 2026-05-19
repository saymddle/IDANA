'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
}

interface PublishedSession {
  id: string
  title: string
  goal?: string
  tags?: string[]
  created_at: string
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile]         = useState<Profile | null>(null)
  const [sessions, setSessions]       = useState<PublishedSession[]>([])
  const [loading, setLoading]         = useState(true)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft]     = useState('')
  const [saving, setSaving]           = useState(false)
  const [signingOut, setSigningOut]   = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error || !user) { router.push('/'); return }

        setProfile({
          id:         user.id,
          email:      user.email ?? '',
          full_name:  user.user_metadata?.full_name ?? null,
          avatar_url: user.user_metadata?.avatar_url ?? null,
          created_at: user.created_at,
        })
        setNameDraft(user.user_metadata?.full_name ?? '')

        // Load published sessions
        const { data: sessionData } = await supabase
          .from('sessions')
          .select('id, title, goal, tags, created_at')
          .eq('published', true)
          .order('created_at', { ascending: false })

        setSessions(sessionData ?? [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  const saveName = async () => {
    if (!nameDraft.trim() || !profile) return
    setSaving(true)
    try {
      await supabase.auth.updateUser({
        data: { full_name: nameDraft.trim() }
      })
      setProfile(p => p ? { ...p, full_name: nameDraft.trim() } : p)
      setEditingName(false)
    } finally {
      setSaving(false)
    }
  }

  const signOut = async () => {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.push('/')
  }

  const joinedDate = profile
    ? new Date(profile.created_at).toLocaleDateString([], {
        year: 'numeric', month: 'long',
      })
    : ''

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : profile?.email?.[0]?.toUpperCase() ?? '?'

  if (loading) {
    return (
      <div className="prof-loading">
        <div className="prof-spinner" />
        <style>{`.prof-loading{display:flex;align-items:center;justify-content:center;height:100vh}.prof-spinner{width:20px;height:20px;border:2px solid #C4B9A8;border-top-color:#8B5E3C;border-radius:50%;animation:ps 0.8s linear infinite}@keyframes ps{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="prof-root">
      {/* Avatar + name */}
      <div className="prof-hero">
        <div className="prof-avatar">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" className="prof-avatar-img" />
          ) : (
            <span className="prof-avatar-initials">{initials}</span>
          )}
        </div>

        <div className="prof-hero-info">
          {editingName ? (
            <div className="prof-name-edit">
              <input
                className="prof-name-input"
                value={nameDraft}
                autoFocus
                onChange={e => setNameDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') saveName()
                  if (e.key === 'Escape') setEditingName(false)
                }}
                placeholder="Your name"
              />
              <button className="prof-save-btn" onClick={saveName} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button className="prof-cancel-btn" onClick={() => setEditingName(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <div className="prof-name-row">
              <h1 className="prof-name">
                {profile.full_name || 'No name set'}
              </h1>
              <button
                className="prof-edit-btn"
                onClick={() => setEditingName(true)}
                title="Edit name"
              >
                Edit
              </button>
            </div>
          )}
          <p className="prof-email">{profile.email}</p>
          <p className="prof-joined">Member since {joinedDate}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="prof-stats">
        <div className="prof-stat">
          <span className="prof-stat-value">{sessions.length}</span>
          <span className="prof-stat-label">Published</span>
        </div>
        <div className="prof-stat-divider" />
        <div className="prof-stat">
          <span className="prof-stat-value">—</span>
          <span className="prof-stat-label">Total sessions</span>
        </div>
        <div className="prof-stat-divider" />
        <div className="prof-stat">
          <span className="prof-stat-value">—</span>
          <span className="prof-stat-label">Forks</span>
        </div>
      </div>

      {/* Published sessions */}
      <div className="prof-section">
        <h2 className="prof-section-title">Published Sessions</h2>

        {sessions.length === 0 ? (
          <div className="prof-empty">
            <span className="prof-empty-icon">◈</span>
            <p className="prof-empty-text">No published sessions yet.</p>
            <button
              className="prof-empty-btn"
              onClick={() => router.push('/sessions')}
            >
              Go to Sessions
            </button>
          </div>
        ) : (
          <div className="prof-sessions">
            {sessions.map(session => (
              <div
                key={session.id}
                className="prof-session-card"
                onClick={() => router.push(`/explore/${session.id}`)}
              >
                <div className="prof-session-info">
                  <h3 className="prof-session-title">{session.title}</h3>
                  {session.goal && (
                    <p className="prof-session-goal">{session.goal}</p>
                  )}
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
                    {new Date(session.created_at).toLocaleDateString([], {
                      month: 'short', day: 'numeric',
                    })}
                  </span>
                  <span className="prof-session-arrow">→</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Account actions */}
      <div className="prof-section">
        <h2 className="prof-section-title">Account</h2>
        <div className="prof-actions">
          <button
            className="prof-signout-btn"
            onClick={signOut}
            disabled={signingOut}
          >
            {signingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      </div>

      <style>{`
        .prof-root {
          padding: 40px 32px 80px;
          max-width: 640px;
          font-family: 'DM Sans', system-ui, sans-serif;
        }

        /* Hero */
        .prof-hero {
          display: flex; align-items: center; gap: 20px;
          margin-bottom: 28px;
        }
        .prof-avatar {
          width: 72px; height: 72px; border-radius: 50%;
          background: linear-gradient(135deg, #8B5E3C, #C89B3C);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; overflow: hidden;
          border: 2px solid #C4B9A8;
        }
        .prof-avatar-img {
          width: 100%; height: 100%; object-fit: cover;
        }
        .prof-avatar-initials {
          font-size: 24px; font-weight: 700;
          color: #F2EBD9; font-family: 'Playfair Display', Georgia, serif;
        }

        .prof-hero-info { flex: 1; min-width: 0; }
        .prof-name-row { display: flex; align-items: center; gap: 10px; }
        .prof-name {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 22px; font-weight: 600; color: #1C1A17; margin: 0;
        }
        .prof-edit-btn {
          font-size: 11px; font-weight: 600; color: #8B5E3C;
          background: none; border: 1px solid #C4B9A8;
          border-radius: 6px; padding: 3px 8px; cursor: pointer;
          font-family: 'DM Sans', system-ui, sans-serif; transition: all 0.15s;
        }
        .prof-edit-btn:hover { border-color: #8B5E3C; }

        .prof-name-edit { display: flex; align-items: center; gap: 8px; }
        .prof-name-input {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 20px; font-weight: 600; color: #1C1A17;
          background: transparent; border: none;
          border-bottom: 1.5px solid #8B5E3C; outline: none;
          padding-bottom: 2px; flex: 1;
        }
        .prof-save-btn {
          font-size: 12px; font-weight: 600; color: #F2EBD9;
          background: #8B5E3C; border: none; border-radius: 8px;
          padding: 6px 12px; cursor: pointer;
          font-family: 'DM Sans', system-ui, sans-serif;
        }
        .prof-save-btn:disabled { opacity: 0.6; cursor: wait; }
        .prof-cancel-btn {
          font-size: 12px; color: #9A8F80; background: none;
          border: 1px solid #C4B9A8; border-radius: 8px;
          padding: 6px 10px; cursor: pointer;
          font-family: 'DM Sans', system-ui, sans-serif;
        }

        .prof-email { font-size: 13px; color: #9A8F80; margin: 4px 0 2px; }
        .prof-joined { font-size: 11px; color: #B0A090; margin: 0; }

        /* Stats */
        .prof-stats {
          display: flex; align-items: center; gap: 0;
          background: #FDFAF4; border: 1.5px solid #C4B9A8;
          border-radius: 14px; padding: 16px 24px;
          margin-bottom: 32px;
        }
        .prof-stat {
          display: flex; flex-direction: column; align-items: center;
          gap: 3px; flex: 1;
        }
        .prof-stat-value {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 22px; font-weight: 600; color: #1C1A17;
        }
        .prof-stat-label { font-size: 11px; color: #9A8F80; }
        .prof-stat-divider {
          width: 1px; height: 36px; background: #EDE6D6; flex-shrink: 0;
        }

        /* Section */
        .prof-section { margin-bottom: 32px; }
        .prof-section-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 16px; font-weight: 600; color: #1C1A17;
          margin: 0 0 14px; letter-spacing: -0.01em;
        }

        /* Empty */
        .prof-empty {
          display: flex; flex-direction: column; align-items: center;
          gap: 8px; padding: 40px 0; text-align: center;
        }
        .prof-empty-icon { font-size: 32px; color: #C4B9A8; }
        .prof-empty-text { font-size: 13px; color: #9A8F80; margin: 0; font-style: italic; }
        .prof-empty-btn {
          font-size: 12px; font-weight: 600; color: #F2EBD9;
          background: #1C1A17; border: none; border-radius: 8px;
          padding: 8px 14px; cursor: pointer; margin-top: 4px;
          font-family: 'DM Sans', system-ui, sans-serif;
        }

        /* Sessions list */
        .prof-sessions { display: flex; flex-direction: column; gap: 8px; }
        .prof-session-card {
          display: flex; align-items: center; gap: 12px;
          background: #FDFAF4; border: 1.5px solid #C4B9A8;
          border-radius: 12px; padding: 14px 16px;
          cursor: pointer; transition: all 0.15s;
        }
        .prof-session-card:hover {
          border-color: #8B5E3C;
          box-shadow: 0 4px 12px rgba(60,40,20,0.08);
          transform: translateY(-1px);
        }
        .prof-session-info { flex: 1; min-width: 0; }
        .prof-session-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 15px; font-weight: 600; color: #1C1A17; margin: 0 0 3px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .prof-session-goal {
          font-size: 12px; color: #6B5D50; margin: 0 0 5px;
          font-style: italic; white-space: nowrap;
          overflow: hidden; text-overflow: ellipsis;
        }
        .prof-session-tags { display: flex; gap: 4px; flex-wrap: wrap; }
        .prof-session-tag {
          font-size: 10px; font-weight: 500;
          background: rgba(139,94,60,0.08); color: #8B5E3C;
          border-radius: 20px; padding: 2px 7px;
        }
        .prof-session-meta {
          display: flex; flex-direction: column; align-items: flex-end;
          gap: 4px; flex-shrink: 0;
        }
        .prof-session-date { font-size: 11px; color: #B0A090; }
        .prof-session-arrow { font-size: 14px; color: #C4B9A8; }
        .prof-session-card:hover .prof-session-arrow { color: #8B5E3C; }

        /* Account actions */
        .prof-actions { display: flex; gap: 10px; }
        .prof-signout-btn {
          font-size: 13px; font-weight: 500; color: #C0394B;
          background: rgba(192,57,75,0.06);
          border: 1.5px solid rgba(192,57,75,0.2);
          border-radius: 10px; padding: 10px 18px;
          cursor: pointer; font-family: 'DM Sans', system-ui, sans-serif;
          transition: all 0.15s;
        }
        .prof-signout-btn:hover {
          background: rgba(192,57,75,0.12);
          border-color: #C0394B;
        }
        .prof-signout-btn:disabled { opacity: 0.6; cursor: wait; }

        @media (max-width: 600px) {
          .prof-root { padding: 24px 16px 80px; }
          .prof-hero { flex-direction: column; align-items: flex-start; gap: 14px; }
          .prof-stats { padding: 14px 16px; }
          .prof-stat-value { font-size: 18px; }
        }
      `}</style>
    </div>
  )
}