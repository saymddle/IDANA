'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Session {
  id: string
  title: string
  goal?: string
  tags?: string[]
  cover_photo?: string | null
  updated_at: string
  created_at: string
}

export default function ExplorePage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (activeTag) params.set('tag', activeTag)
    const res = await fetch(`/api/explore?${params}`)
    const json = await res.json()
    if (json.sessions) setSessions(json.sessions)
    setLoading(false)
  }, [activeTag])

  useEffect(() => { load() }, [load])

  const allTags = Array.from(
    new Set(sessions.flatMap(s => s.tags ?? []))
  ).sort()

  const filtered = search.trim()
    ? sessions.filter(s => {
        const q = search.toLowerCase()
        return (
          s.title.toLowerCase().includes(q) ||
          s.goal?.toLowerCase().includes(q) ||
          (s.tags ?? []).some(t => t.toLowerCase().includes(q))
        )
      })
    : sessions

  const relativeTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    const days = Math.floor(diff / 86400000)
    if (days < 1) return 'today'
    if (days < 7) return `${days}d ago`
    return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return (
    <div className="ex-root">
      <div className="ex-header">
        <p className="ex-eyebrow">Community</p>
        <h1 className="ex-heading">Explore</h1>
        <p className="ex-sub">Published culinary R&D sessions from the Idana community</p>
      </div>

      <div className="ex-search-wrap">
        <input
          className="ex-search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search published sessions..."
        />
        {search && (
          <button className="ex-search-clear" onClick={() => setSearch('')}>×</button>
        )}
      </div>

      {allTags.length > 0 && (
        <div className="ex-tags-row">
          <button
            className={`ex-tag-chip ${!activeTag ? 'ex-tag-chip--active' : ''}`}
            onClick={() => setActiveTag(null)}
          >
            All
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              className={`ex-tag-chip ${activeTag === tag ? 'ex-tag-chip--active' : ''}`}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="ex-empty"><p className="ex-empty-text">Loading...</p></div>
      ) : filtered.length === 0 ? (
        <div className="ex-empty">
          <span className="ex-empty-icon">🔭</span>
          <h3 className="ex-empty-heading">Nothing here yet</h3>
          <p className="ex-empty-text">
            {sessions.length === 0
              ? 'No published sessions yet. Be the first to share your R&D!'
              : 'No sessions match your search.'}
          </p>
        </div>
      ) : (
        <div className="ex-grid">
          {filtered.map(s => (
            <button
              key={s.id}
              className="ex-card"
              onClick={() => router.push(`/explore/${s.id}`)}
            >
              <div className="ex-card-cover">
                {s.cover_photo ? (
                  <img src={s.cover_photo} alt={s.title} className="ex-card-img" />
                ) : (
                  <div className="ex-card-cover-empty">
                    <span className="ex-card-glyph">🌿</span>
                  </div>
                )}
              </div>
              <div className="ex-card-body">
                <h3 className="ex-card-title">{s.title}</h3>
                {s.goal && <p className="ex-card-goal">{s.goal}</p>}
                {(s.tags ?? []).length > 0 && (
                  <div className="ex-card-tags">
                    {(s.tags ?? []).slice(0, 3).map(tag => (
                      <span key={tag} className="ex-card-tag">{tag}</span>
                    ))}
                    {(s.tags ?? []).length > 3 && (
                      <span className="ex-card-tag ex-card-tag--more">+{(s.tags ?? []).length - 3}</span>
                    )}
                  </div>
                )}
                <span className="ex-card-time">{relativeTime(s.updated_at || s.created_at)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <style>{`
        .ex-root {
          padding: 32px 24px 80px;
          background: #F5EFE3;
          min-height: 100vh;
          font-family: 'DM Sans', system-ui, sans-serif;
        }
        .ex-header { margin-bottom: 24px; }
        .ex-eyebrow {
          font-size: 11px; font-weight: 600;
          letter-spacing: 0.08em; text-transform: uppercase;
          color: #9A8F80; margin: 0 0 6px;
        }
        .ex-heading {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 28px; font-weight: 600;
          color: #1C1A17; margin: 0 0 6px; line-height: 1.15;
        }
        .ex-sub { font-size: 13px; color: #9A8F80; margin: 0; line-height: 1.5; }

        .ex-search-wrap { position: relative; margin-bottom: 16px; }
        .ex-search {
          width: 100%; box-sizing: border-box;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 13px; color: #1C1A17;
          background: #FDFAF4; border: 1.5px solid #C4B9A8;
          border-radius: 24px; padding: 9px 36px 9px 16px;
          outline: none; transition: border-color 0.15s;
        }
        .ex-search:focus { border-color: #8B5E3C; }
        .ex-search::placeholder { color: #B0A090; }
        .ex-search-clear {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          font-size: 16px; color: #9A8F80; padding: 0;
        }

        .ex-tags-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 20px; }
        .ex-tag-chip {
          font-size: 11px; font-weight: 500;
          font-family: 'DM Sans', system-ui, sans-serif;
          color: #6B5D50; background: transparent;
          border: 1px solid #C4B9A8; border-radius: 20px;
          padding: 4px 12px; cursor: pointer; transition: all 0.12s;
        }
        .ex-tag-chip:hover { border-color: #8B5E3C; color: #8B5E3C; }
        .ex-tag-chip--active { background: #8B5E3C; border-color: #8B5E3C; color: #F2EBD9; }

        .ex-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 16px;
        }
        .ex-card {
          background: #FDFAF4; border: 1.5px solid #C4B9A8;
          border-radius: 16px; overflow: hidden;
          cursor: pointer; text-align: left;
          transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
          display: flex; flex-direction: column;
        }
        .ex-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(60,40,20,0.1);
          border-color: #8B5E3C;
        }
        .ex-card-cover {
          width: 100%; height: 140px;
          position: relative; overflow: hidden;
          background: #F5EFE3; flex-shrink: 0;
        }
        .ex-card-img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .ex-card-cover-empty {
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #F5EFE3 0%, #EDE3D0 100%);
        }
        .ex-card-glyph { font-size: 32px; line-height: 1; }
        .ex-card-body { padding: 12px 14px 14px; display: flex; flex-direction: column; gap: 6px; flex: 1; }
        .ex-card-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 15px; font-weight: 600; color: #1C1A17; margin: 0;
          line-height: 1.3; overflow: hidden;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
        }
        .ex-card-goal {
          font-size: 12px; color: #6B5D50; margin: 0; font-style: italic;
          font-family: 'Playfair Display', Georgia, serif; overflow: hidden;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
          line-height: 1.45;
        }
        .ex-card-tags { display: flex; flex-wrap: wrap; gap: 4px; }
        .ex-card-tag {
          font-size: 10px; font-weight: 500;
          background: rgba(139,94,60,0.08); color: #8B5E3C;
          border-radius: 20px; padding: 2px 7px;
          font-family: 'DM Sans', system-ui, sans-serif;
        }
        .ex-card-tag--more { background: transparent; color: #9A8F80; border: 1px solid #C4B9A8; }
        .ex-card-time {
          font-size: 10px; color: #B0A090;
          font-family: 'DM Sans', system-ui, sans-serif;
          margin-top: auto; padding-top: 4px;
        }

        .ex-empty {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 12px; padding: 64px 32px; text-align: center;
          border: 1.5px dashed #C4B9A8; border-radius: 20px; margin-top: 16px;
        }
        .ex-empty-icon { font-size: 40px; line-height: 1; }
        .ex-empty-heading {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 20px; font-weight: 400; color: #1C1A17; margin: 0;
        }
        .ex-empty-text { font-size: 13px; color: #9A8F80; margin: 0; line-height: 1.5; }
      `}</style>
    </div>
  )
}
