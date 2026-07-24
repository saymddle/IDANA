'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import BriefDrawer from '@/components/sessions/BriefDrawer'
import { sessionCategory, categoryColor } from '@/lib/categories'

interface Session {
  id: string
  title: string
  goal?: string
  tags?: string[]
  category?: string | null
  brief?: string | null
  hypothesis?: string | null
  method?: string | null
  cover_photo?: string | null
  published: boolean
  created_at: string
  updated_at: string
  node_count: number
}

type SortKey = 'updated_at' | 'created_at' | 'title'

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function SessionsPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('updated_at')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/sessions')
    const json = await res.json()
    if (json.sessions) setSessions(json.sessions)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const allTags = Array.from(new Set(sessions.flatMap(s => s.tags ?? []))).sort()

  const filtered = sessions
    .filter(s => {
      if (activeTag && !(s.tags ?? []).includes(activeTag)) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const inTitle = s.title.toLowerCase().includes(q)
        const inGoal = s.goal?.toLowerCase().includes(q) ?? false
        const inTags = (s.tags ?? []).some(t => t.toLowerCase().includes(q))
        if (!inTitle && !inGoal && !inTags) return false
      }
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title)
      return new Date(b[sortBy]).getTime() - new Date(a[sortBy]).getTime()
    })

  async function handleCreate() {
    setCreating(true)
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Untitled Session' }),
    })
    const json = await res.json()
    if (json.session) router.push(`/sessions/${json.session.id}`)
    setCreating(false)
  }

  async function handleDelete(id: string) {
    await fetch(`/api/sessions/${id}`, { method: 'DELETE' })
    setSessions(prev => prev.filter(s => s.id !== id))
    setSelectedId(cur => (cur === id ? null : cur))
  }

  async function handlePublishToggle(id: string, published: boolean) {
    await fetch(`/api/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published }),
    })
    setSessions(prev => prev.map(s => s.id === id ? { ...s, published } : s))
  }

  async function handleDuplicate(id: string) {
    const res = await fetch(`/api/sessions/${id}/duplicate`, { method: 'POST' })
    const json = await res.json()
    if (json.session) {
      setSessions(prev => [{ ...json.session, node_count: 0 }, ...prev])
      setSelectedId(null)
    }
  }

  const selected = sessions.find(s => s.id === selectedId) ?? null
  const countLabel = loading
    ? 'Loading…'
    : `${sessions.length} session${sessions.length === 1 ? '' : 's'}`

  return (
    <div className="sp-root">
      <div className="sp-inner">
        <div className="sp-brand">
          <span className="sp-brand-name">IDANA</span>
          <span className="sp-brand-sub">Culinary R&amp;D notebook</span>
        </div>

        <div className="sp-head">
          <div>
            <h1 className="sp-title">Sessions</h1>
            <p className="sp-count">{countLabel}</p>
          </div>
          <button className="sp-new" onClick={handleCreate} disabled={creating}>
            <span className="sp-new-plus">＋</span> {creating ? 'Creating…' : 'New Session'}
          </button>
        </div>

        <div className="sp-controls">
          <div className="sp-search-wrap">
            <span className="sp-search-icon">⌕</span>
            <input
              className="sp-search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search title, goal, or tag…"
            />
            {search && <button className="sp-search-clear" onClick={() => setSearch('')}>×</button>}
          </div>
          <select
            className="sp-sort"
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortKey)}
          >
            <option value="updated_at">Last updated</option>
            <option value="created_at">Date created</option>
            <option value="title">Title</option>
          </select>
        </div>

        {allTags.length > 0 && (
          <div className="sp-tags">
            <button
              className={`sp-tag ${!activeTag ? 'sp-tag--active' : ''}`}
              onClick={() => setActiveTag(null)}
            >All</button>
            {allTags.map(tag => (
              <button
                key={tag}
                className={`sp-tag ${activeTag === tag ? 'sp-tag--active' : ''}`}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              >{tag}</button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="sp-empty"><p className="sp-empty-text">Loading…</p></div>
        ) : filtered.length === 0 ? (
          <div className="sp-empty">
            <div className="sp-empty-title">
              {sessions.length === 0 ? 'No sessions yet' : 'No sessions match your search.'}
            </div>
            <button className="sp-new" onClick={handleCreate} disabled={creating}>
              <span className="sp-new-plus">＋</span> New Session
            </button>
          </div>
        ) : (
          <div className="sp-grid">
            {filtered.map(s => {
              const cat = sessionCategory(s)
              const catColor = categoryColor(cat)
              return (
                <div key={s.id} className="sp-card" onClick={() => setSelectedId(s.id)}>
                  <div className="sp-card-top">
                    <span className="sp-card-cat" style={{ color: catColor }}>{cat || 'Session'}</span>
                    <div className="sp-card-meta">
                      <span
                        className="sp-pub-dot"
                        style={{ background: s.published ? '#2F5D3A' : '#C4B9A8' }}
                        title={s.published ? 'Published' : 'Draft'}
                      />
                      <span className="sp-card-nodes">{s.node_count} nodes</span>
                    </div>
                  </div>
                  <div className="sp-card-title">{s.title}</div>
                  {s.goal && <div className="sp-card-goal">{s.goal}</div>}
                  {(s.tags ?? []).length > 0 && (
                    <div className="sp-card-tags">
                      {(s.tags ?? []).slice(0, 3).map(t => (
                        <span key={t} className="sp-card-tag">{t}</span>
                      ))}
                    </div>
                  )}
                  <div className="sp-card-foot">
                    <span className="sp-card-updated">Updated {relativeTime(s.updated_at)}</span>
                    <span className="sp-card-brief">View brief →</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <BriefDrawer
        session={selected}
        onClose={() => setSelectedId(null)}
        onOpenCanvas={id => router.push(`/sessions/${id}`)}
        onDuplicate={handleDuplicate}
        onTogglePublish={handlePublishToggle}
        onDelete={handleDelete}
      />

      <style>{`
        .sp-root { min-height: 100vh; background: #F5EFE3; font-family: 'DM Sans', system-ui, sans-serif; }
        .sp-inner { max-width: 980px; margin: 0 auto; padding: 46px 40px 80px; }

        .sp-brand { display: flex; align-items: baseline; gap: 11px; margin-bottom: 26px; }
        .sp-brand-name { font-family: 'Playfair Display', Georgia, serif; font-size: 22px; font-weight: 600; letter-spacing: 0.03em; color: #1C1A17; }
        .sp-brand-sub { font-size: 10.5px; letter-spacing: 0.14em; text-transform: uppercase; color: #9A8F80; }

        .sp-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 22px; flex-wrap: wrap; }
        .sp-title { font-family: 'Playfair Display', Georgia, serif; font-weight: 500; font-size: 28px; color: #1C1A17; margin: 0 0 3px; }
        .sp-count { font-size: 13px; color: #9A8F80; margin: 0; }
        .sp-new {
          display: flex; align-items: center; gap: 7px;
          font-size: 13.5px; font-weight: 600; color: #F5EFE3; background: #8B5E3C;
          border: none; border-radius: 22px; padding: 10px 18px; cursor: pointer;
          font-family: inherit; transition: background 0.15s; white-space: nowrap;
        }
        .sp-new:hover { background: #734c30; }
        .sp-new:disabled { opacity: 0.6; cursor: default; }
        .sp-new-plus { font-size: 15px; line-height: 1; }

        .sp-controls { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
        .sp-search-wrap { position: relative; flex: 1; min-width: 240px; max-width: 440px; }
        .sp-search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #9A8F80; font-size: 14px; pointer-events: none; }
        .sp-search {
          width: 100%; box-sizing: border-box; font-family: inherit; font-size: 14px; color: #1C1A17;
          background: #FDFAF4; border: 1px solid #C4B9A8; border-radius: 24px;
          padding: 10px 34px 10px 36px; outline: none; transition: border-color 0.15s;
        }
        .sp-search:focus { border-color: #8B5E3C; }
        .sp-search::placeholder { color: #B0A090; }
        .sp-search-clear {
          position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
          width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;
          border: none; background: #EDE6D6; color: #6B5D50; border-radius: 50%; cursor: pointer; font-size: 12px;
        }
        .sp-sort {
          font-family: inherit; font-size: 13px; color: #1C1A17;
          background: #FDFAF4; border: 1px solid #C4B9A8; border-radius: 20px;
          padding: 9px 14px; cursor: pointer; outline: none;
        }

        .sp-tags { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 26px; }
        .sp-tag {
          font-size: 11px; font-weight: 500; color: #6B5D50; background: transparent;
          border: 1px solid #C4B9A8; border-radius: 20px; padding: 4px 12px; cursor: pointer;
          font-family: inherit; transition: all 0.12s;
        }
        .sp-tag:hover { border-color: #8B5E3C; color: #8B5E3C; }
        .sp-tag--active { background: #8B5E3C; border-color: #8B5E3C; color: #F2EBD9; }

        .sp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(244px, 1fr)); gap: 16px; }
        .sp-card {
          display: flex; flex-direction: column; gap: 9px;
          background: #FDFAF4; border: 1px solid #C4B9A8; border-radius: 14px; padding: 16px;
          cursor: pointer; box-shadow: 0 1px 3px rgba(28,26,23,0.05);
          transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
        }
        .sp-card:hover { border-color: #8B5E3C; box-shadow: 0 6px 18px rgba(28,26,23,0.10); transform: translateY(-2px); }
        .sp-card-top { display: flex; align-items: center; justify-content: space-between; }
        .sp-card-cat { font-size: 9.5px; letter-spacing: 0.09em; text-transform: uppercase; font-weight: 600; }
        .sp-card-meta { display: flex; align-items: center; gap: 7px; }
        .sp-pub-dot { width: 7px; height: 7px; border-radius: 50%; }
        .sp-card-nodes { font-size: 10.5px; color: #9A8F80; }
        .sp-card-title { font-family: 'Playfair Display', Georgia, serif; font-size: 16px; line-height: 1.25; color: #1C1A17; }
        .sp-card-goal {
          font-size: 12px; color: #6B5D50; line-height: 1.4;
          overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
        }
        .sp-card-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 2px; }
        .sp-card-tag {
          font-family: 'JetBrains Mono', monospace; font-size: 9.5px; color: #6B5D50;
          background: #EDE6D6; padding: 2px 7px; border-radius: 5px;
        }
        .sp-card-foot {
          display: flex; align-items: center; justify-content: space-between;
          margin-top: 4px; border-top: 1px solid #EDE6D6; padding-top: 9px;
        }
        .sp-card-updated { font-size: 10.5px; color: #9A8F80; }
        .sp-card-brief { font-size: 11px; font-weight: 600; color: #8B5E3C; }

        .sp-empty {
          display: flex; flex-direction: column; align-items: center; gap: 14px;
          padding: 70px 20px; text-align: center;
          border: 1.5px dashed #C4B9A8; border-radius: 20px; margin-top: 8px;
        }
        .sp-empty-title { font-family: 'Playfair Display', Georgia, serif; font-style: italic; font-size: 18px; color: #6B5D50; }
        .sp-empty-text { font-size: 13px; color: #9A8F80; margin: 0; }

        @media (max-width: 640px) {
          .sp-inner { padding: 30px 18px 80px; }
        }
      `}</style>
    </div>
  )
}
