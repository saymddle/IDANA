'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import NewSessionModal from '@/components/NewSessionModal'
import { Icon, FoodArt, FoodArtProps } from '@/components/Icons'

interface Session {
  id: string; name: string; status: string
  category: string | null; notes: string | null; created_at: string
}
interface SessionTag { session_id: string; tag_name: string }

const QUICK_TAGS = ['Umami', 'Smoky', 'Rich', 'Bright', 'Spicy', 'Sweet', 'Savory', 'Earthy', 'Bold']

const PALETTES: FoodArtProps['palette'][] = [
  ['#3D2C1F', '#6B4A2B', '#A77B4E', '#1C1C1A'],
  ['#E8E1C9', '#C5D4A4', '#FAF7EE', '#7C8C5B'],
  ['#8B3A1F', '#D4A24C', '#C16E2D', '#3A1F12'],
  ['#F2DC8E', '#E8B746', '#FBF5DA', '#A07924'],
  ['#2A2326', '#5C4A56', '#D4C5C2', '#1A1518'],
]
const GLYPHS = ['octopus', 'leaf', 'circle', 'grain', 'dot'] as const

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}
function artFor(id: string) {
  const h = hashStr(id)
  return { palette: PALETTES[h % PALETTES.length], glyph: GLYPHS[h % GLYPHS.length] }
}

export default function SessionsPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionTags, setSessionTags] = useState<SessionTag[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all')
  const [activeTagFilter, setActiveTagFilter] = useState<string[]>([])
  const [showNewSession, setShowNewSession] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: s }, { data: tags }] = await Promise.all([
      supabase.from('sessions').select('*').order('created_at', { ascending: false }),
      supabase.from('session_tags').select('session_id, tag_name'),
    ])
    if (s) setSessions(s)
    if (tags) setSessionTags(tags)
    setLoading(false)
  }

  const tagMap = sessionTags.reduce((acc, t) => {
    if (!acc[t.session_id]) acc[t.session_id] = []
    acc[t.session_id].push(t.tag_name)
    return acc
  }, {} as Record<string, string[]>)

  const filtered = sessions.filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false
    if (activeTagFilter.length > 0) {
      const sTags = tagMap[s.id] || []
      if (!activeTagFilter.every(t => sTags.includes(t))) return false
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      const inName = s.name.toLowerCase().includes(q)
      const inNotes = s.notes?.toLowerCase().includes(q)
      const inTags = (tagMap[s.id] || []).some(t => t.toLowerCase().includes(q))
      if (!inName && !inNotes && !inTags) return false
    }
    return true
  })

  function toggleTagFilter(tag: string) {
    setActiveTagFilter(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  const hasFilters = activeTagFilter.length > 0 || statusFilter !== 'all' || search.trim()

  return (
    <div style={{ padding: '32px 36px 48px', background: 'var(--bg)', minHeight: '100vh', paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: 6 }}>R&D Workspace</p>
          <h1 className="h-section">Sessions</h1>
        </div>
        <button className="cta" onClick={() => setShowNewSession(true)}>
          <Icon.Plus size={16} stroke="#FBF8F2" /> New
        </button>
      </div>

      {/* Search */}
      <div className="search" style={{ marginBottom: 14 }}>
        <Icon.Search size={18} stroke="var(--muted)" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search sessions, notes, tags..."
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>
            <Icon.Close size={16} stroke="var(--muted)" />
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div className="scroll-hide" style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 24, paddingBottom: 4 }}>
        {(['all', 'open', 'closed'] as const).map(f => (
          <button key={f} onClick={() => setStatusFilter(f)}
            className={`chip ${statusFilter === f ? 'is-active' : 'is-soft'}`}
            style={{ flexShrink: 0, textTransform: 'capitalize', height: 32, fontSize: 12 }}
          >
            {f}
          </button>
        ))}
        <div style={{ width: 1, background: 'var(--line-strong)', margin: '0 4px', flexShrink: 0 }} />
        {QUICK_TAGS.map(tag => {
          const active = activeTagFilter.includes(tag)
          return (
            <button key={tag} onClick={() => toggleTagFilter(tag)}
              className={`chip ${active ? 'is-active' : 'is-soft'}`}
              style={{ flexShrink: 0, height: 32, fontSize: 12 }}
            >
              {tag}
            </button>
          )
        })}
        {hasFilters && (
          <button onClick={() => { setActiveTagFilter([]); setStatusFilter('all'); setSearch('') }}
            style={{ background: 'none', border: 'none', color: 'var(--tier-twist)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: '0 8px', flexShrink: 0 }}
          >
            Clear all
          </button>
        )}
      </div>

      {hasFilters && !loading && (
        <p className="body-sm" style={{ marginBottom: 14 }}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </p>
      )}

      {loading ? (
        <p className="body-sm">Loading sessions...</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 40px', border: '1px dashed var(--line-strong)', borderRadius: 20 }}>
          <p style={{ fontSize: 36, marginBottom: 12 }}>🧪</p>
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 400, color: 'var(--ink)', marginBottom: 8 }}>
            {sessions.length === 0 ? 'No sessions yet' : 'No matching sessions'}
          </h3>
          <p className="body-sm" style={{ marginBottom: 20 }}>
            {sessions.length === 0
              ? 'Start exploring ingredients and click "New" to begin.'
              : 'Try adjusting your search or filters.'}
          </p>
          {sessions.length === 0 && (
            <button className="cta" onClick={() => router.push('/')}>
              Explore Ingredients
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(session => {
            const tags = tagMap[session.id] || []
            const art = artFor(session.id)
            return (
              <button
                key={session.id}
                onClick={() => router.push(`/sessions/${session.id}`)}
                style={{
                  display: 'flex', gap: 0, textAlign: 'left',
                  background: 'var(--card)', border: '1px solid var(--line)',
                  borderRadius: 18, cursor: 'pointer', overflow: 'hidden',
                  boxShadow: 'var(--shadow-1)', width: '100%',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-1px)'; el.style.boxShadow = 'var(--shadow-2)' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = ''; el.style.boxShadow = 'var(--shadow-1)' }}
              >
                {/* FoodArt thumbnail */}
                <div style={{ width: 76, flexShrink: 0, overflow: 'hidden', borderRadius: '17px 0 0 17px' }}>
                  <FoodArt palette={art.palette} glyph={art.glyph} style={{ height: '100%', minHeight: 84 }} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className={`badge ${session.status}`}>
                      <span className="dot" />
                      {session.status === 'open' ? 'Open' : 'Closed'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>
                      {new Date(session.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  <h3 style={{ fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 400, color: 'var(--ink)', margin: 0, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {session.name}
                  </h3>

                  {tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {tags.slice(0, 3).map(tag => (
                        <span key={tag} className="chip is-soft" style={{ height: 22, fontSize: 10, padding: '0 8px' }}>
                          {tag}
                        </span>
                      ))}
                      {tags.length > 3 && (
                        <span style={{ fontSize: 10, color: 'var(--muted)', padding: '2px 0' }}>+{tags.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {showNewSession && (
        <NewSessionModal
          ingredientA=""
          allIngredients={[]}
          onClose={() => setShowNewSession(false)}
        />
      )}
    </div>
  )
}
