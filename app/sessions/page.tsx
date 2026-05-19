'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import SessionCard from '@/components/sessions/SessionCard'

interface Session {
  id: string
  title: string
  goal?: string
  tags?: string[]
  cover_photo?: string | null
  published: boolean
  created_at: string
  updated_at: string
  node_count: number
}

type SortKey = 'updated_at' | 'created_at' | 'title'

export default function SessionsPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('updated_at')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/sessions')
    const json = await res.json()
    if (json.sessions) setSessions(json.sessions)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const allTags = Array.from(
    new Set(sessions.flatMap(s => s.tags ?? []))
  ).sort()

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
    }
  }

  return (
    <div className="sp-root">
      <div className="sp-header">
        <div>
          <p className="sp-eyebrow">R&D Workspace</p>
          <h1 className="sp-heading">Sessions</h1>
        </div>
        <button className="sp-new-btn" onClick={handleCreate} disabled={creating}>
          {creating ? '...' : '+ New Session'}
        </button>
      </div>

      <div className="sp-controls">
        <div className="sp-search-wrap">
          <input
            className="sp-search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search sessions..."
          />
          {search && (
            <button className="sp-search-clear" onClick={() => setSearch('')}>×</button>
          )}
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
        <div className="sp-tags-row">
          <button
            className={`sp-tag-chip ${!activeTag ? 'sp-tag-chip--active' : ''}`}
            onClick={() => setActiveTag(null)}
          >
            All
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              className={`sp-tag-chip ${activeTag === tag ? 'sp-tag-chip--active' : ''}`}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="sp-empty">
          <p className="sp-empty-text">Loading...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="sp-empty">
          <span className="sp-empty-icon">🧪</span>
          <h3 className="sp-empty-heading">
            {sessions.length === 0 ? 'No sessions yet' : 'No matching sessions'}
          </h3>
          <p className="sp-empty-text">
            {sessions.length === 0
              ? 'Create your first session to start capturing culinary R&D.'
              : 'Try adjusting your search or filters.'}
          </p>
          {sessions.length === 0 && (
            <button className="sp-new-btn" onClick={handleCreate} disabled={creating}>
              + New Session
            </button>
          )}
        </div>
      ) : (
        <div className="sp-grid">
          {filtered.map(s => (
            <SessionCard
              key={s.id}
              id={s.id}
              title={s.title}
              goal={s.goal}
              tags={s.tags}
              coverPhoto={s.cover_photo}
              nodeCount={s.node_count}
              published={s.published}
              updatedAt={s.updated_at}
              createdAt={s.created_at}
              onOpen={id => router.push(`/sessions/${id}`)}
              onDelete={handleDelete}
              onPublishToggle={handlePublishToggle}
              onDuplicate={handleDuplicate}
            />
          ))}
        </div>
      )}

      <style>{`
        .sp-root {
          padding: 32px 24px 80px;
          background: #F5EFE3;
          min-height: 100vh;
          font-family: 'DM Sans', system-ui, sans-serif;
        }
        .sp-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 24px;
          gap: 16px;
        }
        .sp-eyebrow {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #9A8F80;
          margin: 0 0 6px;
        }
        .sp-heading {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 28px;
          font-weight: 600;
          color: #1C1A17;
          margin: 0;
          line-height: 1.15;
        }
        .sp-new-btn {
          font-size: 13px;
          font-weight: 600;
          font-family: 'DM Sans', system-ui, sans-serif;
          color: #F2EBD9;
          background: #8B5E3C;
          border: none;
          border-radius: 24px;
          padding: 10px 18px;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
          transition: background 0.15s;
        }
        .sp-new-btn:hover { background: #6E4A2A; }
        .sp-new-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .sp-controls {
          display: flex;
          gap: 10px;
          margin-bottom: 16px;
          align-items: center;
        }
        .sp-search-wrap { flex: 1; position: relative; }
        .sp-search {
          width: 100%;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 13px;
          color: #1C1A17;
          background: #FDFAF4;
          border: 1.5px solid #C4B9A8;
          border-radius: 24px;
          padding: 9px 36px 9px 16px;
          outline: none;
          transition: border-color 0.15s;
          box-sizing: border-box;
        }
        .sp-search:focus { border-color: #8B5E3C; }
        .sp-search::placeholder { color: #B0A090; }
        .sp-search-clear {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          font-size: 16px; color: #9A8F80; padding: 0; line-height: 1;
        }
        .sp-sort {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 12px; color: #6B5D50;
          background: #FDFAF4; border: 1.5px solid #C4B9A8;
          border-radius: 24px; padding: 8px 12px;
          outline: none; cursor: pointer; flex-shrink: 0; appearance: none;
        }
        .sp-tags-row {
          display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 20px;
        }
        .sp-tag-chip {
          font-size: 11px; font-weight: 500;
          font-family: 'DM Sans', system-ui, sans-serif;
          color: #6B5D50; background: transparent;
          border: 1px solid #C4B9A8; border-radius: 20px;
          padding: 4px 12px; cursor: pointer; transition: all 0.12s;
        }
        .sp-tag-chip:hover { border-color: #8B5E3C; color: #8B5E3C; }
        .sp-tag-chip--active { background: #8B5E3C; border-color: #8B5E3C; color: #F2EBD9; }
        .sp-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 16px;
        }
        .sp-empty {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 12px; padding: 64px 32px; text-align: center;
          border: 1.5px dashed #C4B9A8; border-radius: 20px; margin-top: 16px;
        }
        .sp-empty-icon { font-size: 40px; line-height: 1; }
        .sp-empty-heading {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 20px; font-weight: 400; color: #1C1A17; margin: 0;
        }
        .sp-empty-text { font-size: 13px; color: #9A8F80; margin: 0; line-height: 1.5; }
      `}</style>
    </div>
  )
}
