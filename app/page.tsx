'use client'

import { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import NewSessionModal from '@/components/NewSessionModal'
import { sessionCategory, categoryColor } from '@/lib/categories'

const PairingGraph = dynamic(() => import('@/components/PairingGraph'), { ssr: false })

interface Pairing { name: string; score: number; emphasis: boolean }
interface SearchResult { ingredient: string; pairings: Pairing[]; found: boolean }
interface Session {
  id: string
  title: string
  goal?: string
  tags?: string[]
  category?: string | null
  published: boolean
  node_count?: number
  created_at: string
  updated_at?: string
}

const SUGGESTIONS = ['Chocolate', 'Salmon', 'Miso', 'Lamb', 'Lemon', 'Vanilla', 'Cinnamon', 'Avocado']

function relativeTime(iso?: string) {
  if (!iso) return ''
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

export default function HomePage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sessionModal, setSessionModal] = useState<{ ingredient: string; pairings: string[] } | null>(null)
  const [recentSessions, setRecentSessions] = useState<Session[]>([])
  const [loadingRecent, setLoadingRecent] = useState(true)

  useEffect(() => {
    fetch('/api/sessions')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.sessions) setRecentSessions(d.sessions.slice(0, 6)) })
      .catch(() => {})
      .finally(() => setLoadingRecent(false))
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

  const handleStartSession = (ingredient: string, pairings: string[]) =>
    setSessionModal({ ingredient, pairings })

  const showGraph = result && !loading

  return (
    <div className="hm-root">
      <div className="hm-inner">
        <div className="hm-brand">
          <span className="hm-brand-name">IDANA</span>
          <span className="hm-brand-sub">Culinary R&amp;D notebook</span>
        </div>

        {!showGraph ? (
          <>
            <h1 className="hm-h1">What are you working with?</h1>
            <p className="hm-lede">
              Search an ingredient to surface its strongest flavor pairings — then spin up a session on the canvas.
            </p>
            <form
              className="hm-form"
              onSubmit={e => { e.preventDefault(); search(query) }}
            >
              <input
                className="hm-search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Try miso, chocolate, black garlic…"
              />
              <button type="submit" className="hm-explore" disabled={loading}>
                {loading ? '…' : 'Explore'}
              </button>
            </form>
            <div className="hm-chips">
              <span className="hm-chips-label">Try</span>
              {SUGGESTIONS.map(s => (
                <button key={s} className="hm-chip" onClick={() => { setQuery(s); search(s) }}>{s}</button>
              ))}
            </div>
            {error && <p className="hm-error">{error}</p>}
          </>
        ) : (
          <>
            <button className="hm-back" onClick={() => { setResult(null); setError(null); setQuery('') }}>← back</button>
            <div className="hm-result-head">
              <h1 className="hm-result-name">{result!.ingredient}</h1>
              <span className="hm-pair-count">{result!.pairings.length} pairings</span>
            </div>
            <p className="hm-result-sub">Click a pairing to start a session.</p>
            <div className="hm-graph-card">
              <PairingGraph
                ingredient={result!.ingredient}
                pairings={result!.pairings}
                sessionId={null}
                onStartSession={handleStartSession}
              />
            </div>
          </>
        )}

        {/* Recent sessions */}
        <div className="hm-recent-head">
          <h2 className="hm-recent-title">Recent sessions</h2>
          <button className="hm-viewall" onClick={() => router.push('/sessions')}>View all →</button>
        </div>
        {loadingRecent ? (
          <div className="hm-recent-empty">Loading…</div>
        ) : recentSessions.length === 0 ? (
          <div className="hm-recent-empty">No sessions yet — search an ingredient and start one.</div>
        ) : (
          <div className="hm-grid">
            {recentSessions.map(s => {
              const cat = sessionCategory(s)
              return (
                <button key={s.id} className="hm-card" onClick={() => router.push(`/sessions/${s.id}`)}>
                  <div className="hm-card-top">
                    <span className="hm-card-cat" style={{ color: categoryColor(cat) }}>{cat || 'Session'}</span>
                    <span className="hm-card-nodes">{s.node_count ?? 0} nodes</span>
                  </div>
                  <div className="hm-card-title">{s.title}</div>
                  {s.goal && <div className="hm-card-goal">{s.goal}</div>}
                  {(s.tags ?? []).length > 0 && (
                    <div className="hm-card-tags">
                      {(s.tags ?? []).slice(0, 2).map(t => <span key={t} className="hm-card-tag">{t}</span>)}
                    </div>
                  )}
                  <div className="hm-card-updated">Updated {relativeTime(s.updated_at || s.created_at)}</div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {sessionModal && (
        <NewSessionModalMulti
          ingredient={sessionModal.ingredient}
          pairingNames={sessionModal.pairings}
          onClose={() => setSessionModal(null)}
        />
      )}

      <style>{`
        .hm-root { min-height: 100vh; background: #F5EFE3; font-family: 'DM Sans', system-ui, sans-serif; overflow-y: auto; }
        .hm-inner { max-width: 900px; margin: 0 auto; padding: 46px 40px 72px; }

        .hm-brand { display: flex; align-items: baseline; gap: 11px; margin-bottom: 36px; }
        .hm-brand-name { font-family: 'Playfair Display', Georgia, serif; font-size: 22px; font-weight: 600; letter-spacing: 0.03em; color: #1C1A17; }
        .hm-brand-sub { font-size: 10.5px; letter-spacing: 0.14em; text-transform: uppercase; color: #9A8F80; }

        .hm-h1 { font-family: 'Playfair Display', Georgia, serif; font-weight: 500; font-size: 30px; line-height: 1.2; color: #1C1A17; margin: 0 0 8px; }
        .hm-lede { font-size: 14px; color: #6B5D50; margin: 0 0 22px; max-width: 520px; }
        .hm-form { display: flex; gap: 10px; max-width: 560px; margin-bottom: 16px; }
        .hm-search { flex: 1; font-size: 15px; color: #1C1A17; background: #FDFAF4; border: 1px solid #C4B9A8; border-radius: 24px; padding: 12px 18px; outline: none; font-family: inherit; transition: border-color 0.15s; }
        .hm-search:focus { border-color: #2F5D3A; }
        .hm-search::placeholder { color: #B0A090; }
        .hm-explore { font-size: 14px; font-weight: 600; color: #F5EFE3; background: #2F5D3A; border: none; border-radius: 24px; padding: 12px 24px; cursor: pointer; font-family: inherit; transition: background 0.15s; }
        .hm-explore:hover { background: #264c30; }
        .hm-explore:disabled { opacity: 0.7; cursor: default; }
        .hm-chips { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; margin-bottom: 52px; }
        .hm-chips-label { font-size: 12px; color: #9A8F80; margin-right: 2px; }
        .hm-chip { font-size: 12.5px; color: #4A3D30; background: #FDFAF4; border: 1px solid #C4B9A8; border-radius: 20px; padding: 6px 14px; cursor: pointer; font-family: inherit; transition: all 0.15s; }
        .hm-chip:hover { border-color: #8B5E3C; color: #8B5E3C; }
        .hm-error { font-size: 13px; color: #C0394B; margin: 0 0 40px; }

        .hm-back { font-size: 13px; color: #6B5D50; background: none; border: none; cursor: pointer; padding: 0; margin-bottom: 14px; font-family: inherit; }
        .hm-back:hover { color: #1C1A17; }
        .hm-result-head { display: flex; align-items: baseline; gap: 12px; margin-bottom: 2px; }
        .hm-result-name { font-family: 'Playfair Display', Georgia, serif; font-style: italic; font-weight: 500; font-size: 36px; color: #1C1A17; margin: 0; }
        .hm-pair-count { font-size: 13px; color: #9A8F80; }
        .hm-result-sub { font-size: 13px; color: #6B5D50; margin: 0 0 18px; }
        .hm-graph-card { height: 380px; background: #1C1A17; border: 1px solid #3D2B1F; border-radius: 16px; padding: 10px; margin-bottom: 46px; }

        .hm-recent-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 16px; border-top: 1px solid #E4DAC6; padding-top: 26px; }
        .hm-recent-title { font-family: 'Playfair Display', Georgia, serif; font-weight: 500; font-size: 19px; color: #1C1A17; margin: 0; }
        .hm-viewall { font-size: 12.5px; color: #8B5E3C; background: none; border: none; cursor: pointer; font-family: inherit; }
        .hm-viewall:hover { color: #5a3d27; }
        .hm-recent-empty { font-size: 13px; color: #9A8F80; font-style: italic; padding: 24px 0; }

        .hm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
        .hm-card { text-align: left; display: flex; flex-direction: column; gap: 9px; background: #FDFAF4; border: 1px solid #C4B9A8; border-radius: 14px; padding: 16px; cursor: pointer; box-shadow: 0 1px 3px rgba(28,26,23,0.05); font-family: inherit; transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s; }
        .hm-card:hover { border-color: #8B5E3C; box-shadow: 0 6px 18px rgba(28,26,23,0.10); transform: translateY(-2px); }
        .hm-card-top { display: flex; align-items: center; justify-content: space-between; }
        .hm-card-cat { font-size: 9.5px; letter-spacing: 0.09em; text-transform: uppercase; font-weight: 600; }
        .hm-card-nodes { font-size: 10.5px; color: #9A8F80; }
        .hm-card-title { font-family: 'Playfair Display', Georgia, serif; font-size: 16px; line-height: 1.25; color: #1C1A17; }
        .hm-card-goal { font-size: 12px; color: #6B5D50; line-height: 1.4; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
        .hm-card-tags { display: flex; flex-wrap: wrap; gap: 5px; }
        .hm-card-tag { font-family: 'JetBrains Mono', monospace; font-size: 9.5px; color: #6B5D50; background: #EDE6D6; padding: 2px 7px; border-radius: 5px; }
        .hm-card-updated { font-size: 10.5px; color: #9A8F80; margin-top: 2px; }

        @media (max-width: 640px) {
          .hm-inner { padding: 30px 18px 72px; }
          .hm-form { flex-direction: column; }
        }
      `}</style>
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
  // Single pairing reuses the two-ingredient modal; multiple falls through to
  // the dedicated form below. Split into a sub-component so hooks are never
  // called conditionally.
  if (pairingNames.length === 1) {
    return (
      <NewSessionModal
        ingredientA={ingredient}
        ingredientB={pairingNames[0]}
        onClose={onClose}
      />
    )
  }
  return <MultiSessionForm ingredient={ingredient} pairingNames={pairingNames} onClose={onClose} />
}

function MultiSessionForm({
  ingredient, pairingNames, onClose,
}: {
  ingredient: string
  pairingNames: string[]
  onClose: () => void
}) {
  const router = useRouter()
  const [name, setName] = useState(`${ingredient} + ${pairingNames.length} pairings`)
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(false)

  const CATEGORIES = ['Burgers','Sauces','Desserts','Mains','Sides','Soups','Salads','Breakfast','Drinks','Snacks','Other']

  const handleCreate = async () => {
    setLoading(true)
    try {
      const allIngredients = [ingredient, ...pairingNames]
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: name.trim(),
          tags: category ? [category] : [],
          category: category || null,
          goal: allIngredients.join(', '),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      router.push(`/sessions/${json.session.id}`)
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
