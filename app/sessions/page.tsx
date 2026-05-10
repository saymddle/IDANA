'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import NewSessionModal from '@/components/NewSessionModal'

interface Session {
  id: string; name: string; status: string
  category: string | null; notes: string | null; created_at: string
}
interface SessionTag { session_id: string; tag_name: string }

const QUICK_TAGS = ['Umami', 'Smoky', 'Rich', 'Bright', 'Spicy', 'Sweet', 'Savory', 'Earthy', 'Bold']

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

  return (
    <div style={{ padding: '32px 40px', background: 'var(--bg)', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: 6 }}>R&D Workspace</p>
          <h1 style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 36, fontWeight: 900, color: 'var(--ink)', margin: 0 }}>
            Sessions
          </h1>
        </div>
        <button
          onClick={() => setShowNewSession(true)}
          style={{
            padding: '11px 20px', background: 'var(--green)', color: '#FBF7F0',
            border: 'none', borderRadius: 999, fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 7,
            boxShadow: '0 4px 14px rgba(47,93,58,0.25)',
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> New Session
        </button>
      </div>

      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--surface)', border: '1px solid var(--line-2)',
        borderRadius: 999, padding: '0 18px', marginBottom: 16,
      }}>
        <span style={{ color: 'var(--ink-4)', fontSize: 15 }}>⌕</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search sessions, notes, tags..."
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            fontSize: 14, color: 'var(--ink)', padding: '13px 0', fontFamily: 'inherit',
          }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: 'var(--ink-4)', cursor: 'pointer', fontSize: 16 }}>×</button>
        )}
      </div>

      {/* Filters row */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {(['all', 'open', 'closed'] as const).map(f => (
          <button key={f} onClick={() => setStatusFilter(f)} style={{
            padding: '6px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
            border: `1px solid ${statusFilter === f ? 'var(--green)' : 'var(--line)'}`,
            background: statusFilter === f ? 'var(--green-soft)' : 'transparent',
            color: statusFilter === f ? 'var(--green-deep)' : 'var(--ink-3)',
            fontSize: 12, fontWeight: statusFilter === f ? 600 : 400, textTransform: 'capitalize',
          }}>
            {f}
          </button>
        ))}

        <div style={{ width: 1, background: 'var(--line)', margin: '0 4px' }} />

        {QUICK_TAGS.map(tag => {
          const active = activeTagFilter.includes(tag)
          return (
            <button key={tag} onClick={() => toggleTagFilter(tag)} style={{
              padding: '6px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
              border: `1px solid ${active ? 'var(--amber)' : 'var(--line)'}`,
              background: active ? 'var(--amber-soft)' : 'transparent',
              color: active ? '#6B4D14' : 'var(--ink-3)',
              fontSize: 12, fontWeight: active ? 600 : 400,
            }}>
              {tag}
            </button>
          )
        })}

        {(activeTagFilter.length > 0 || statusFilter !== 'all' || search) && (
          <button onClick={() => { setActiveTagFilter([]); setStatusFilter('all'); setSearch('') }} style={{
            background: 'none', border: 'none', color: 'var(--coral)', fontSize: 12,
            fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: '6px 0',
          }}>
            Clear all
          </button>
        )}
      </div>

      {!loading && (search || activeTagFilter.length > 0 || statusFilter !== 'all') && (
        <p style={{ fontSize: 13, color: 'var(--ink-4)', marginBottom: 16 }}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </p>
      )}

      {loading ? (
        <p style={{ color: 'var(--ink-4)', fontSize: 14 }}>Loading sessions...</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 40px', border: '2px dashed var(--line)', borderRadius: 16 }}>
          <p style={{ fontSize: 36, marginBottom: 12 }}>🧪</p>
          <h3 style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>
            {sessions.length === 0 ? 'No sessions yet' : 'No matching sessions'}
          </h3>
          <p style={{ color: 'var(--ink-4)', fontSize: 14, marginBottom: 20 }}>
            {sessions.length === 0
              ? 'Start exploring ingredients and click "Start Session" to begin.'
              : 'Try adjusting your search or filters.'}
          </p>
          {sessions.length === 0 && (
            <button onClick={() => router.push('/')} style={{
              padding: '11px 24px', borderRadius: 999, background: 'var(--green)',
              color: '#FBF7F0', border: 'none', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Explore Ingredients
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {filtered.map(session => {
            const tags = tagMap[session.id] || []
            return (
              <button
                key={session.id}
                onClick={() => router.push(`/sessions/${session.id}`)}
                style={{
                  textAlign: 'left', padding: '18px 20px',
                  background: 'var(--surface)', border: '1px solid var(--line)',
                  borderRadius: 18, cursor: 'pointer',
                  boxShadow: 'var(--soft-shadow)', width: '100%',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = '0 6px 24px rgba(60,40,20,0.08)' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = ''; el.style.boxShadow = 'var(--soft-shadow)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span className={`status-badge status-${session.status}`}>
                    {session.status === 'open' ? 'Open' : 'Closed'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>
                    {new Date(session.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>

                <h3 style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 18, fontWeight: 700, color: 'var(--ink)', margin: '0 0 8px', lineHeight: 1.2 }}>
                  {session.name}
                </h3>

                {session.category && (
                  <p style={{ fontSize: 11, color: 'var(--ink-4)', margin: '0 0 8px' }}>🏷 {session.category}</p>
                )}

                {tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {tags.slice(0, 4).map(tag => (
                      <span key={tag} style={{
                        padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 600,
                        background: 'var(--surface-2)', color: 'var(--ink-3)',
                        border: '1px solid var(--line)',
                      }}>
                        {tag}
                      </span>
                    ))}
                    {tags.length > 4 && (
                      <span style={{ fontSize: 10, color: 'var(--ink-4)', padding: '2px 0' }}>+{tags.length - 4}</span>
                    )}
                  </div>
                )}
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
