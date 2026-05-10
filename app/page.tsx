'use client'

import { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import NewSessionModal from '@/components/NewSessionModal'

const PairingGraph = dynamic(() => import('@/components/PairingGraph'), { ssr: false })

interface Pairing { name: string; score: number; emphasis: boolean }
interface SearchResult { ingredient: string; pairings: Pairing[]; found: boolean }
interface Session { id: string; name: string; status: string; category: string | null; created_at: string }
interface Dish { id: string; name: string; category: string | null; created_at: string }

const SUGGESTIONS = ['Chocolate', 'Salmon', 'Miso', 'Lamb', 'Lemon', 'Vanilla', 'Cinnamon', 'Avocado']

export default function HomePage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sessionModal, setSessionModal] = useState<{ ingredient: string; pairings: string[] } | null>(null)
  const [recentSessions, setRecentSessions] = useState<Session[]>([])
  const [recentDishes, setRecentDishes] = useState<Dish[]>([])
  const [loadingRecent, setLoadingRecent] = useState(true)

  useEffect(() => {
    async function loadRecent() {
      const [{ data: sessions }, { data: dishes }] = await Promise.all([
        supabase.from('sessions').select('*').order('created_at', { ascending: false }).limit(3),
        supabase.from('dishes').select('*').order('created_at', { ascending: false }).limit(3),
      ])
      if (sessions) setRecentSessions(sessions)
      if (dishes) setRecentDishes(dishes)
      setLoadingRecent(false)
    }
    loadRecent()
  }, [])

  const search = useCallback(async (name: string) => {
    if (!name.trim()) return
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/ingredient/${encodeURIComponent(name.trim())}`)
      const data = await res.json()
      if (!data.found) { setError(`No pairings found for "${name}".`); setResult(null) }
      else setResult(data)
    } catch { setError('Something went wrong.') }
    finally { setLoading(false) }
  }, [])

  const handleStartSession = (ingredient: string, pairings: string[]) => {
    setSessionModal({ ingredient, pairings })
  }

  const showGraph = result && !loading

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>

      {/*── Top section: heading + search ── */}
      <div style={{
        padding: showGraph ? '20px 36px 0' : '0 36px',
        flexShrink: 0,
        transition: 'padding 0.3s ease',
      }}>
        {!showGraph && (
          <div style={{ textAlign: 'center', paddingTop: 48, paddingBottom: 28 }}>
            <p className="eyebrow" style={{ marginBottom: 10 }}>Flavor Intelligence</p>
            <h1 style={{
              fontFamily: 'Fraunces, Georgia, serif',
              fontWeight: 600, fontSize: 64,
              lineHeight: 0.96, letterSpacing: '-0.035em',
              color: 'var(--ink)', margin: '0 0 14px',
            }}>
              What are you<br /><em>cooking today?</em>
            </h1>
            <p style={{ color: 'var(--ink-3)', fontSize: 15, lineHeight: 1.5, marginBottom: 24 }}>
              Search any ingredient to explore its flavor universe.
            </p>
          </div>
        )}

        {showGraph && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
            <p className="eyebrow">Pairing Explorer</p>
            <button
              onClick={() => { setResult(null); setError(null); setQuery('') }}
              style={{ background: 'none', border: 'none', color: 'var(--ink-4)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              ← back
            </button>
          </div>
        )}

        {showGraph && (
          <h2 style={{
            fontFamily: 'Fraunces, Georgia, serif',
            fontWeight: 600, fontSize: 40,
            letterSpacing: '-0.03em', color: 'var(--ink)',
            margin: '0 0 14px', lineHeight: 1,
          }}>
            {result.ingredient}
          </h2>
        )}

        {/* Search bar */}
        <div style={{ display: 'flex', gap: 10, maxWidth: showGraph ? 480 : 580, margin: showGraph ? '0' : '0 auto', paddingBottom: 16 }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 10,
            background: 'var(--surface)', border: '1px solid var(--line-2)',
            borderRadius: 999, padding: '0 18px',
          }}>
            <span style={{ color: 'var(--ink-4)', fontSize: 15, flexShrink: 0 }}>⌕</span>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search(query)}
              placeholder="Search any ingredient — miso, lemon, cinnamon..."
              style={{
                flex: 1, border: 'none', outline: 'none', background: 'transparent',
                fontSize: 14, color: 'var(--ink)', padding: '13px 0',
                fontFamily: 'Inter, sans-serif',
              }}
            />
          </div>
          <button
            onClick={() => search(query)}
            disabled={loading}
            style={{
              padding: '13px 22px', background: 'var(--green)', color: '#FBF7F0',
              border: 'none', borderRadius: 999, fontSize: 14, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
              fontFamily: 'Inter, sans-serif', flexShrink: 0,
            }}
          >
            {loading ? '...' : 'Explore'}
          </button>
        </div>

        {/* Suggestion chips — only on empty state */}
        {!showGraph && !loading && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', paddingBottom: 20 }}>
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => { setQuery(s); search(s) }} style={{
                padding: '7px 16px', borderRadius: 999,
                border: '1px solid var(--line)', background: 'var(--surface)',
                color: 'var(--ink-2)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
              }}>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Graph view ── */}
      {showGraph && (
        <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
          <PairingGraph
            ingredient={result.ingredient}
            pairings={result.pairings}
            sessionId={null}
            onStartSession={handleStartSession}
          />
        </div>
      )}

      {/* ── Loading state ── */}
      {loading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--ink-3)' }}>
          <div style={{ width: 18, height: 18, border: '2px solid var(--line)', borderTopColor: 'var(--green)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          Searching flavor graph...
        </div>
      )}

      {/* ── Error ── */}
      {error && !loading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
          <span style={{ fontSize: 36 }}>🍽️</span>
          <p style={{ color: 'var(--ink-3)', fontSize: 15 }}>{error}</p>
        </div>
      )}

      {/* ── Empty state: recent sessions + dishes ── */}
      {!showGraph && !loading && !error && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 36px 48px' }}>

          {/* Recent Sessions */}
          <section style={{ marginBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 600, fontSize: 22, letterSpacing: '-0.02em', color: 'var(--ink)', margin: 0 }}>
                Recent Sessions
              </h2>
              <button
                onClick={() => router.push('/sessions')}
                style={{ background: 'none', border: 'none', color: 'var(--green)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                View all →
              </button>
            </div>

            {loadingRecent ? (
              <p style={{ color: 'var(--ink-4)', fontSize: 13 }}>Loading...</p>
            ) : recentSessions.length === 0 ? (
              <div style={{ padding: '28px 24px', background: 'var(--surface)', border: '1px dashed var(--line-2)', borderRadius: 16, textAlign: 'center' }}>
                <p style={{ color: 'var(--ink-4)', fontSize: 13 }}>No sessions yet — search an ingredient and start one.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                {recentSessions.map(s => (
                  <button
                    key={s.id}
                    onClick={() => router.push(`/sessions/${s.id}`)}
                    style={{
                      textAlign: 'left', padding: '18px 20px',
                      background: 'var(--surface)', border: '1px solid var(--line)',
                      borderRadius: 18, cursor: 'pointer',
                      boxShadow: 'var(--soft-shadow)',
                      transition: 'transform 0.15s, box-shadow 0.15s',
                      display: 'flex', flexDirection: 'column', gap: 10,
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 24px rgba(60,40,20,0.08)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--soft-shadow)' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className={`status-badge status-${s.status}`}>
                        {s.status === 'open' ? 'Open' : 'Closed'}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>
                        {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <h3 style={{
                      fontFamily: 'Fraunces, Georgia, serif',
                      fontSize: 18, fontWeight: 600,
                      color: 'var(--ink)', margin: 0, lineHeight: 1.2,
                    }}>
                      {s.name}
                    </h3>
                    {s.category && (
                      <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>🍴 {s.category}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Recent Dishes */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 600, fontSize: 22, letterSpacing: '-0.02em', color: 'var(--ink)', margin: 0 }}>
                Recent Dishes
              </h2>
              <button
                onClick={() => router.push('/library')}
                style={{ background: 'none', border: 'none', color: 'var(--green)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                View library →
              </button>
            </div>

            {loadingRecent ? (
              <p style={{ color: 'var(--ink-4)', fontSize: 13 }}>Loading...</p>
            ) : recentDishes.length === 0 ? (
              <div style={{ padding: '28px 24px', background: 'var(--surface)', border: '1px dashed var(--line-2)', borderRadius: 16, textAlign: 'center' }}>
                <p style={{ color: 'var(--ink-4)', fontSize: 13 }}>No dishes logged yet — start a session to add your first dish.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                {recentDishes.map(d => (
                  <button
                    key={d.id}
                    onClick={() => router.push(`/library/${d.id}`)}
                    style={{
                      textAlign: 'left', padding: '18px 20px',
                      background: 'var(--surface)', border: '1px solid var(--line)',
                      borderRadius: 18, cursor: 'pointer',
                      boxShadow: 'var(--soft-shadow)',
                      transition: 'transform 0.15s, box-shadow 0.15s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 24px rgba(60,40,20,0.08)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--soft-shadow)' }}
                  >
                    {d.category && (
                      <span style={{
                        display: 'inline-block', marginBottom: 8,
                        padding: '3px 10px', borderRadius: 999,
                        fontSize: 11, fontWeight: 600,
                        background: 'var(--surface-2)', color: 'var(--ink-3)',
                        border: '1px solid var(--line)',
                      }}>
                        {d.category}
                      </span>
                    )}
                    <h3 style={{
                      fontFamily: 'Fraunces, Georgia, serif',
                      fontSize: 18, fontWeight: 600,
                      color: 'var(--ink)', margin: '0 0 8px', lineHeight: 1.2,
                    }}>
                      {d.name}
                    </h3>
                    <p style={{ fontSize: 12, color: 'var(--ink-4)', margin: 0 }}>
                      {new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Session modal */}
      {sessionModal && (
        <NewSessionModalMulti
          ingredient={sessionModal.ingredient}
          pairingNames={sessionModal.pairings}
          onClose={() => setSessionModal(null)}
        />
      )}
    </div>
  )
}

// ── Multi-ingredient session modal ────────────────────────────────────────────
function NewSessionModalMulti({
  ingredient, pairingNames, onClose,
}: {
  ingredient: string
  pairingNames: string[]
  onClose: () => void
}) {
  const router = useRouter()

  if (pairingNames.length === 1) {
    return (
      <NewSessionModal
        ingredientA={ingredient}
        ingredientB={pairingNames[0]}
        onClose={onClose}
      />
    )
  }

  const [name, setName] = useState(`${ingredient} + ${pairingNames.length} pairings`)
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(false)

  const CATEGORIES = ['Burgers','Sauces','Desserts','Mains','Sides','Soups','Salads','Breakfast','Drinks','Snacks','Other']

  const handleCreate = async () => {
    setLoading(true)
    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: session, error } = await supabase
        .from('sessions').insert({ name: name.trim(), category: category || null, status: 'open' }).select().single()
      if (error) throw error
      const allIngredients = [ingredient, ...pairingNames]
      await supabase.from('session_ingredients').insert(
        allIngredients.map(n => ({ session_id: session.id, ingredient_name: n }))
      )
      router.push(`/sessions/${session.id}`)
      onClose()
    } finally { setLoading(false) }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 100 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 101,
        background: 'var(--surface)', borderRadius: '20px 20px 0 0',
        padding: '28px 24px 40px', maxWidth: 560, margin: '0 auto',
        animation: 'slideUp 0.3s ease',
      }}>
        <style>{`@keyframes slideUp { from { transform: translateY(100%); opacity: 0 } to { transform: translateY(0); opacity: 1 } }`}</style>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--line-2)', margin: '0 auto 24px' }} />
        <h2 style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 24, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
          Start a Session
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
          {[ingredient, ...pairingNames].map(n => (
            <span key={n} style={{ padding: '5px 12px', borderRadius: 999, background: 'var(--green-soft)', color: 'var(--green-deep)', fontSize: 12, fontWeight: 600, border: '1px solid transparent' }}>
              {n}
            </span>
          ))}
        </div>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>Session name</label>
        <input value={name} onChange={e => setName(e.target.value)} className="input-text" style={{ marginBottom: 20 }} />
        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>Category</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 24 }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(category === cat ? '' : cat)} style={{
              padding: '6px 14px', borderRadius: 999,
              border: `1px solid ${category === cat ? 'var(--green)' : 'var(--line)'}`,
              background: category === cat ? 'var(--green-soft)' : 'transparent',
              color: category === cat ? 'var(--green-deep)' : 'var(--ink-3)',
              fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: category === cat ? 600 : 400,
            }}>{cat}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 14, borderRadius: 12, border: '1px solid var(--line)', background: 'transparent', color: 'var(--ink-2)', fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={handleCreate} disabled={loading || !name.trim()} style={{ flex: 2, padding: 14, borderRadius: 12, border: 'none', background: !name.trim() ? 'var(--line)' : 'var(--green)', color: '#FBF7F0', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            {loading ? 'Creating...' : 'Start Session'}
          </button>
        </div>
      </div>
    </>
  )
}
