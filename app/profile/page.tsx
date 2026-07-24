'use client'

import { useUser, useClerk } from '@clerk/nextjs'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { sessionCategory, categoryColor } from '@/lib/categories'

interface SessionRow {
  id: string
  title: string
  goal?: string
  tags?: string[]
  category?: string | null
  published: boolean
  node_count: number
  created_at: string
}

interface ProfileFields {
  role: string
  kitchen: string
  location: string
  focus: string
  bio: string
}

const EMPTY_PROFILE: ProfileFields = { role: '', kitchen: '', location: '', focus: '', bio: '' }

export default function ProfilePage() {
  const { user, isLoaded } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()

  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [profile, setProfile] = useState<ProfileFields>(EMPTY_PROFILE)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<ProfileFields & { name: string }>({ ...EMPTY_PROFILE, name: '' })
  const [saving, setSaving] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    fetch('/api/sessions').then(r => r.json())
      .then(d => setSessions(d.sessions ?? []))
      .catch(() => {})
    fetch('/api/profile').then(r => r.json())
      .then(d => { if (d.profile) setProfile({ ...EMPTY_PROFILE, ...d.profile }) })
      .catch(() => {})
  }, [])

  const startEdit = useCallback(() => {
    setDraft({ ...profile, name: user?.fullName ?? '' })
    setEditing(true)
  }, [profile, user])

  const onField = (key: keyof (ProfileFields & { name: string })) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDraft(d => ({ ...d, [key]: e.target.value }))

  async function saveProfile() {
    setSaving(true)
    try {
      // Name lives in Clerk; the rest in our profiles table.
      const name = draft.name.trim()
      if (user && name && name !== user.fullName) {
        const [firstName, ...rest] = name.split(' ')
        try { await user.update({ firstName, lastName: rest.join(' ') }) } catch { /* ignore */ }
      }
      const fields: ProfileFields = {
        role: draft.role, kitchen: draft.kitchen, location: draft.location,
        focus: draft.focus, bio: draft.bio,
      }
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      if (res.ok) {
        const d = await res.json()
        setProfile({ ...EMPTY_PROFILE, ...(d.profile ?? fields) })
        setEditing(false)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    await signOut()
    router.push('/')
  }

  if (!isLoaded) {
    return (
      <div className="pf-loading">
        <div className="pf-spinner" />
        <style>{`.pf-loading{display:flex;align-items:center;justify-content:center;height:100vh}.pf-spinner{width:20px;height:20px;border:2px solid #C4B9A8;border-top-color:#8B5E3C;border-radius:50%;animation:pfs 0.8s linear infinite}@keyframes pfs{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }
  if (!user) return null

  const name = user.fullName || 'No name set'
  const initials = user.fullName
    ? user.fullName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : user.primaryEmailAddress?.emailAddress?.[0]?.toUpperCase() ?? '?'

  const published = sessions.filter(s => s.published)
  const stats = {
    sessions: sessions.length,
    published: published.length,
    nodes: sessions.reduce((n, s) => n + (s.node_count ?? 0), 0),
    tags: new Set(sessions.flatMap(s => s.tags ?? [])).size,
  }

  return (
    <div className="pf-root">
      <div className="pf-inner">
        <div className="pf-brand">
          <span className="pf-brand-name">IDANA</span>
          <span className="pf-brand-sub">Culinary R&amp;D notebook</span>
        </div>

        {/* Hero */}
        <div className="pf-hero">
          <div className="pf-avatar">
            {user.imageUrl
              ? <img src={user.imageUrl} alt="Avatar" className="pf-avatar-img" />
              : <span className="pf-avatar-initials">{initials}</span>}
          </div>
          <div className="pf-hero-info">
            <h1 className="pf-name">{name}</h1>
            {profile.role && <div className="pf-role">{profile.role}</div>}
            <div className="pf-sub">
              {[profile.kitchen, profile.location].filter(Boolean).join(' · ')
                || user.primaryEmailAddress?.emailAddress}
            </div>
          </div>
          {!editing && (
            <button className="pf-edit" onClick={startEdit}>Edit profile</button>
          )}
        </div>

        {/* Stats */}
        <div className="pf-stats">
          <StatTile value={stats.sessions} label="Sessions" />
          <StatTile value={stats.published} label="Published" color="#2F5D3A" />
          <StatTile value={stats.nodes} label="Nodes captured" />
          <StatTile value={stats.tags} label="Tags explored" />
        </div>

        {/* Edit form */}
        {editing && (
          <div className="pf-editcard">
            <div className="pf-editcard-title">Edit profile</div>
            <div className="pf-grid2">
              <Field label="Name" value={draft.name} onChange={onField('name')} />
              <Field label="Role" value={draft.role} onChange={onField('role')} />
              <Field label="Kitchen / Lab" value={draft.kitchen} onChange={onField('kitchen')} />
              <Field label="Location" value={draft.location} onChange={onField('location')} />
            </div>
            <Field label="Focus areas" value={draft.focus} onChange={onField('focus')} full />
            <label className="pf-label">
              <span className="pf-label-text">Bio</span>
              <textarea className="pf-input pf-textarea" value={draft.bio} onChange={onField('bio')} rows={3} />
            </label>
            <div className="pf-editcard-actions">
              <button className="pf-btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
              <button className="pf-btn-solid" onClick={saveProfile} disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        )}

        {/* View mode: focus + bio */}
        {!editing && (
          <div className="pf-about">
            <div className="pf-about-label">Focus areas</div>
            <div className="pf-about-focus">{profile.focus || 'Not set yet.'}</div>
            <div className="pf-about-label">About</div>
            <p className="pf-about-bio">{profile.bio || 'No bio yet — tell people what you work on.'}</p>
          </div>
        )}

        {/* Published work */}
        {published.length > 0 && (
          <div className="pf-section">
            <h2 className="pf-section-title">Published work</h2>
            <div className="pf-grid">
              {published.map(s => {
                const cat = sessionCategory(s)
                return (
                  <div key={s.id} className="pf-card" onClick={() => router.push(`/explore/${s.id}`)}>
                    <div className="pf-card-top">
                      <span className="pf-card-cat" style={{ color: categoryColor(cat) }}>{cat || 'Session'}</span>
                      <span className="pf-card-pub">● Published</span>
                    </div>
                    <div className="pf-card-title">{s.title}</div>
                    {s.goal && <div className="pf-card-goal">{s.goal}</div>}
                    {(s.tags ?? []).length > 0 && (
                      <div className="pf-card-tags">
                        {(s.tags ?? []).slice(0, 3).map(t => <span key={t} className="pf-card-tag">{t}</span>)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Sign out */}
        <div className="pf-signout-row">
          <div>
            <div className="pf-signout-title">Sign out</div>
            <div className="pf-signout-sub">End your session on this device.</div>
          </div>
          <button className="pf-signout-btn" onClick={handleSignOut} disabled={signingOut}>
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </div>

      <style>{`
        .pf-root { min-height: 100vh; background: #F5EFE3; font-family: 'DM Sans', system-ui, sans-serif; }
        .pf-inner { max-width: 760px; margin: 0 auto; padding: 46px 40px 80px; }

        .pf-brand { display: flex; align-items: baseline; gap: 11px; margin-bottom: 32px; }
        .pf-brand-name { font-family: 'Playfair Display', Georgia, serif; font-size: 22px; font-weight: 600; letter-spacing: 0.03em; color: #1C1A17; }
        .pf-brand-sub { font-size: 10.5px; letter-spacing: 0.14em; text-transform: uppercase; color: #9A8F80; }

        .pf-hero { display: flex; align-items: center; gap: 20px; margin-bottom: 30px; }
        .pf-avatar { width: 76px; height: 76px; flex: none; border-radius: 50%; background: #3D2B1F; color: #F5EFE3; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .pf-avatar-img { width: 100%; height: 100%; object-fit: cover; }
        .pf-avatar-initials { font-family: 'Playfair Display', Georgia, serif; font-size: 28px; font-weight: 600; }
        .pf-hero-info { flex: 1; min-width: 0; }
        .pf-name { font-family: 'Playfair Display', Georgia, serif; font-weight: 500; font-size: 27px; color: #1C1A17; margin: 0 0 3px; }
        .pf-role { font-size: 14px; color: #8B5E3C; font-weight: 600; margin-bottom: 2px; }
        .pf-sub { font-size: 12.5px; color: #9A8F80; }
        .pf-edit { flex: none; font-size: 12.5px; font-weight: 500; color: #1C1A17; border: 1px solid #C4B9A8; background: #FDFAF4; border-radius: 20px; padding: 8px 16px; cursor: pointer; font-family: inherit; transition: background 0.15s; }
        .pf-edit:hover { background: #EDE6D6; }

        .pf-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 34px; }
        .pf-stat { background: #FDFAF4; border: 1px solid #C4B9A8; border-radius: 12px; padding: 15px 16px; }
        .pf-stat-value { font-family: 'Playfair Display', Georgia, serif; font-size: 26px; line-height: 1; }
        .pf-stat-label { font-size: 10.5px; letter-spacing: 0.06em; text-transform: uppercase; color: #9A8F80; margin-top: 5px; }

        .pf-editcard { background: #FDFAF4; border: 1px solid #C4B9A8; border-radius: 14px; padding: 22px 24px; margin-bottom: 34px; }
        .pf-editcard-title { font-family: 'Playfair Display', Georgia, serif; font-size: 17px; color: #1C1A17; margin-bottom: 16px; }
        .pf-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
        .pf-label { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
        .pf-label-text { font-size: 10.5px; letter-spacing: 0.06em; text-transform: uppercase; color: #9A8F80; }
        .pf-input { font-family: inherit; font-size: 14px; color: #1C1A17; background: #F5F1EB; border: 1px solid #C4B9A8; border-radius: 8px; padding: 9px 11px; outline: none; transition: border-color 0.15s; }
        .pf-input:focus { border-color: #8B5E3C; }
        .pf-textarea { font-family: 'Playfair Display', Georgia, serif; line-height: 1.5; resize: none; }
        .pf-editcard-actions { display: flex; gap: 8px; justify-content: flex-end; }
        .pf-btn-ghost { font-size: 13px; color: #6B5D50; background: none; border: 1px solid #C4B9A8; border-radius: 9px; padding: 9px 16px; cursor: pointer; font-family: inherit; }
        .pf-btn-ghost:hover { background: #EDE6D6; }
        .pf-btn-solid { font-size: 13px; font-weight: 600; color: #F5EFE3; background: #8B5E3C; border: none; border-radius: 9px; padding: 9px 20px; cursor: pointer; font-family: inherit; }
        .pf-btn-solid:hover { background: #734c30; }
        .pf-btn-solid:disabled { opacity: 0.6; cursor: default; }

        .pf-about { margin-bottom: 34px; }
        .pf-about-label { font-size: 10px; letter-spacing: 0.09em; text-transform: uppercase; color: #9A8F80; margin-bottom: 7px; }
        .pf-about-focus { font-size: 14px; color: #4A3D30; margin-bottom: 18px; }
        .pf-about-bio { font-family: 'Playfair Display', Georgia, serif; font-size: 15.5px; line-height: 1.6; color: #1C1A17; margin: 0; max-width: 620px; white-space: pre-wrap; }

        .pf-section { border-top: 1px solid #E4DAC6; padding-top: 26px; margin-bottom: 34px; }
        .pf-section-title { font-family: 'Playfair Display', Georgia, serif; font-weight: 500; font-size: 19px; color: #1C1A17; margin: 0 0 16px; }
        .pf-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 16px; }
        .pf-card { display: flex; flex-direction: column; gap: 9px; background: #FDFAF4; border: 1px solid #C4B9A8; border-radius: 14px; padding: 16px; cursor: pointer; box-shadow: 0 1px 3px rgba(28,26,23,0.05); transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s; }
        .pf-card:hover { border-color: #8B5E3C; box-shadow: 0 6px 18px rgba(28,26,23,0.10); transform: translateY(-2px); }
        .pf-card-top { display: flex; align-items: center; justify-content: space-between; }
        .pf-card-cat { font-size: 9.5px; letter-spacing: 0.09em; text-transform: uppercase; font-weight: 600; }
        .pf-card-pub { font-size: 10px; font-weight: 600; color: #2F5D3A; }
        .pf-card-title { font-family: 'Playfair Display', Georgia, serif; font-size: 16px; line-height: 1.25; color: #1C1A17; }
        .pf-card-goal { font-size: 12px; color: #6B5D50; line-height: 1.4; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
        .pf-card-tags { display: flex; flex-wrap: wrap; gap: 5px; }
        .pf-card-tag { font-family: 'JetBrains Mono', monospace; font-size: 9.5px; color: #6B5D50; background: #EDE6D6; padding: 2px 7px; border-radius: 5px; }

        .pf-signout-row { border-top: 1px solid #E4DAC6; padding-top: 22px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
        .pf-signout-title { font-size: 14px; color: #1C1A17; font-weight: 500; }
        .pf-signout-sub { font-size: 12px; color: #9A8F80; }
        .pf-signout-btn { flex: none; font-size: 13px; font-weight: 500; color: #C0394B; background: rgba(192,57,75,0.06); border: 1px solid rgba(192,57,75,0.4); border-radius: 9px; padding: 9px 18px; cursor: pointer; font-family: inherit; transition: background 0.15s; }
        .pf-signout-btn:hover { background: rgba(192,57,75,0.14); }
        .pf-signout-btn:disabled { opacity: 0.6; cursor: wait; }

        @media (max-width: 640px) {
          .pf-inner { padding: 30px 18px 80px; }
          .pf-stats { grid-template-columns: repeat(2, 1fr); }
          .pf-grid2 { grid-template-columns: 1fr; }
          .pf-hero { flex-wrap: wrap; }
        }
      `}</style>
    </div>
  )
}

function StatTile({ value, label, color }: { value: number; label: string; color?: string }) {
  return (
    <div className="pf-stat">
      <div className="pf-stat-value" style={{ color: color ?? '#1C1A17' }}>{value}</div>
      <div className="pf-stat-label">{label}</div>
    </div>
  )
}

function Field({ label, value, onChange, full }: {
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  full?: boolean
}) {
  return (
    <label className="pf-label" style={full ? { marginBottom: 14 } : { margin: 0 }}>
      <span className="pf-label-text">{label}</span>
      <input className="pf-input" value={value} onChange={onChange} />
    </label>
  )
}
