'use client'

import { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import NewSessionModal from '@/components/NewSessionModal'
import { Icon, FoodArt, FoodArtProps } from '@/components/Icons'

const PairingGraph = dynamic(() => import('@/components/PairingGraph'), { ssr: false })

interface Pairing { name: string; score: number; emphasis: boolean }
interface SearchResult { ingredient: string; pairings: Pairing[]; found: boolean }
interface Session { id: string; name: string; status: string; category: string | null; created_at: string }
interface Dish { id: string; name: string; category: string | null; created_at: string }

const SUGGESTIONS = ['Chocolate', 'Salmon', 'Miso', 'Lamb', 'Lemon', 'Vanilla', 'Cinnamon', 'Avocado']

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
        supabase.from('sessions').select('*').order('created_at', { ascending: false }).limit(6),
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

      {/* ── Top section ── */}
      <div style={{
        padding: showGraph ? '20px 32px 0' : '0 32px',
        flexShrink: 0, transition: 'padding 0.3s ease',
      }}>
        {/* Empty-state hero */}
        {!showGraph && (
          <div style={{ textAlign: 'center', paddingTop: 48, paddingBottom: 20 }}>
            <p className="eyebrow" style={{ marginBottom: 10 }}>Flavor Intelligence</p>
            <h1 className="h-display" style={{ margin: '0 0 14px' }}>
              What are you<br />
              cooking <span className="accent">today?</span>
            </h1>
            <p className="body-md" style={{ maxWidth: 380, margin: '0 auto 24px' }}>
              Search any ingredient to explore its flavor universe.
            </p>
          </div>
        )}

        {/* Graph-state header */}
        {showGraph && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
            <p className="eyebrow">Pairing Explorer</p>
            <button
              onClick={() => { setResult(null); setError(null); setQuery('') }}
              style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              ← back
            </button>
          </div>
        )}
        {showGraph && (
          <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 400, fontSize: 36, letterSpacing: '-0.01em', color: 'var(--ink)', margin: '0 0 12px', lineHeight: 1 }}>
            {result.ingredient}
          </h2>
        )}

        {/* Search bar */}
        <div style={{ maxWidth: showGraph ? 520 : 600, margin: showGraph ? '0' : '0 auto', paddingBottom: 14 }}>
          <div className="search">
            <Icon.Search size={18} stroke="var(--muted)" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search(query)}
              placeholder="Search any ingredient — miso, lemon, cinnamon..."
            />
            <button
              className="cta"
              onClick={() => search(query)}
              disabled={loading}
              style={{ height: 36, padding: '0 16px', fontSize: 13, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? '...' : 'Explore'}
            </button>
          </div>
        </div>

        {/* Quick picks */}
        {!showGraph && !loading && (
          <div className="scroll-hide" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 20, paddingLeft: 4, paddingRight: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
            {SUGGESTIONS.map(s => (
              <button key={s} className="chip is-soft" onClick={() => { setQuery(s); search(s) }} style={{ flexShrink: 0, cursor: 'pointer' }}>
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

      {/* ── Loading ── */}
      {loading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--muted)' }}>
          <div style={{ width: 18, height: 18, border: '2px solid var(--line)', borderTopColor: 'var(--green)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          Searching flavor graph...
        </div>
      )}

      {/* ── Error ── */}
      {error && !loading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
          <p className="body-md">{error}</p>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: 'var(--green)', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Try another</button>
        </div>
      )}

      {/* ── Empty state: recent sessions ── */}
      {!showGraph && !loading && !error && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 32px 48px' }}>

          <section style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 400, fontSize: 22, color: 'var(--ink)', margin: 0 }}>
                Recent Sessions
              </h2>
              <button
                onClick={() => router.push('/sessions')}
                style={{ background: 'none', border: 'none', color: 'var(--green)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                View all <Icon.ChevronRight size={14} stroke="var(--green)" />
              </button>
            </div>

            {loadingRecent ? (
              <p className="body-sm">Loading...</p>
            ) : recentSessions.length === 0 ? (
              <div style={{ padding: '28px 24px', background: 'var(--card-soft)', border: '1px dashed var(--line-strong)', borderRadius: 16, textAlign: 'center' }}>
                <p className="body-sm">No sessions yet — search an ingredient and start one.</p>
              </div>
            ) : (
              <div className="scroll-hide" style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 8 }}>
                {recentSessions.map(s => {
                  const art = artFor(s.id)
                  return (
                    <button
                      key={s.id}
                      onClick={() => router.push(`/sessions/${s.id}`)}
                      style={{
                        flexShrink: 0, width: 156, textAlign: 'left',
                        background: 'var(--card)', border: '1px solid var(--line)',
                        borderRadius: 16, overflow: 'hidden',
                        boxShadow: 'var(--shadow-1)', cursor: 'pointer',
                        transition: 'transform 0.15s, box-shadow 0.15s',
                      }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = 'var(--shadow-2)' }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = ''; el.style.boxShadow = 'var(--shadow-1)' }}
                    >
                      <div style={{ height: 100, overflow: 'hidden' }}>
                        <FoodArt palette={art.palette} glyph={art.glyph} />
                      </div>
                      <div style={{ padding: '10px 12px 12px' }}>
                        <span className={`badge ${s.status}`}>
                          <span className="dot" />
                          {s.status === 'open' ? 'Open' : 'Closed'}
                        </span>
                        <h3 style={{ fontFamily: 'var(--serif)', fontSize: 14, lineHeight: 1.2, color: 'var(--ink)', margin: '6px 0 0', fontWeight: 400 }}>
                          {s.name}
                        </h3>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          {/* Recent Dishes — compact list */}
          {!loadingRecent && recentDishes.length > 0 && (
            <section>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 400, fontSize: 22, color: 'var(--ink)', margin: 0 }}>
                  Recent Dishes
                </h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentDishes.map(d => (
                  <button
                    key={d.id}
                    onClick={() => router.push(`/library/${d.id}`)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      textAlign: 'left', padding: '12px 16px',
                      background: 'var(--card)', border: '1px solid var(--line)',
                      borderRadius: 14, cursor: 'pointer',
                      boxShadow: 'var(--shadow-1)', transition: 'transform 0.15s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = '' }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontFamily: 'var(--serif)', fontSize: 15, fontWeight: 400, color: 'var(--ink)', margin: 0, lineHeight: 1.2 }}>
                        {d.name}
                      </h3>
                      {d.category && <p className="body-sm" style={{ margin: '3px 0 0' }}>{d.category}</p>}
                    </div>
                    <Icon.ChevronRight size={16} stroke="var(--muted)" />
                  </button>
                ))}
              </div>
            </section>
          )}
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
      const { data: { user } } = await supabase.auth.getUser()
      const { data: session, error } = await supabase
        .from('sessions').insert({ name: name.trim(), category: category || null, status: 'open', user_id: user?.id }).select().single()
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
        background: 'var(--card)', borderRadius: '20px 20px 0 0',
        padding: '28px 24px 40px', maxWidth: 560, margin: '0 auto',
        animation: 'slideUp 0.3s ease',
      }}>
        <style>{`@keyframes slideUp { from { transform: translateY(100%); opacity: 0 } to { transform: translateY(0); opacity: 1 } }`}</style>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--line-strong)', margin: '0 auto 24px' }} />
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 400, color: 'var(--ink)', marginBottom: 6 }}>
          Start a Session
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
          {[ingredient, ...pairingNames].map(n => (
            <span key={n} className="chip is-soft" style={{ height: 28, fontSize: 12 }}>{n}</span>
          ))}
        </div>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>Session name</label>
        <input value={name} onChange={e => setName(e.target.value)} className="input-text" style={{ marginBottom: 20 }} />
        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>Category</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 24 }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(category === cat ? '' : cat)}
              className={`chip ${category === cat ? 'is-active' : 'is-soft'}`}
              style={{ height: 30, fontSize: 12 }}
            >{cat}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 14, borderRadius: 12, border: '1px solid var(--line)', background: 'transparent', color: 'var(--ink-soft)', fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={handleCreate} disabled={loading || !name.trim()} className="cta" style={{ flex: 2, height: 52, fontSize: 15, opacity: loading || !name.trim() ? 0.6 : 1 }}>
            {loading ? 'Creating...' : 'Start Session'}
          </button>
        </div>
      </div>
    </>
  )
}
