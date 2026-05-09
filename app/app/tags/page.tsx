'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'

const PairingGraph = dynamic(() => import('@/components/PairingGraph'), { ssr: false })

interface IngredientResult { name: string; tags: string[] }
interface Pairing { name: string; score: number; emphasis: boolean }

const TAG_LIBRARY: Record<string, string[]> = {
  'Flavor Profile': ['Umami', 'Sweet', 'Salty', 'Sour', 'Bitter', 'Savory', 'Funky', 'Fermented'],
  'Aromatic':       ['Smoky', 'Earthy', 'Floral', 'Herbaceous', 'Citrus-forward', 'Bright', 'Toasty', 'Nutty', 'Pungent'],
  'Texture':        ['Rich', 'Fatty', 'Creamy', 'Crispy', 'Silky', 'Crunchy', 'Tender'],
  'Heat':           ['Mild', 'Medium heat', 'Spicy', 'Fiery', 'Bold', 'Subtle'],
}
const CATEGORY_COLORS: Record<string, string> = {
  'Flavor Profile': '#2F5D3A',
  'Aromatic':       '#C8923A',
  'Texture':        '#6B5B8A',
  'Heat':           '#C56B4F',
}

export default function TagsPage() {
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [results, setResults] = useState<IngredientResult[]>([])
  const [searching, setSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const [explorerIngredient, setExplorerIngredient] = useState<string | null>(null)
  const [explorerPairings, setExplorerPairings] = useState<Pairing[]>([])
  const [explorerLoading, setExplorerLoading] = useState(false)

  const search = useCallback(async (tags: string[]) => {
    if (tags.length === 0) { setResults([]); setHasSearched(false); return }
    setSearching(true); setHasSearched(true)
    try {
      const res = await fetch('/api/ingredients/by-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags }),
      })
      const data = await res.json()
      setResults(data.ingredients ?? [])
    } catch { setResults([]) }
    finally { setSearching(false) }
  }, [])

  function toggleTag(tag: string) {
    const next = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag]
    setSelectedTags(next)
    search(next)
  }

  async function openExplorer(ingredientName: string) {
    setExplorerIngredient(ingredientName)
    setExplorerPairings([])
    setExplorerLoading(true)
    try {
      const res = await fetch(`/api/ingredient/${encodeURIComponent(ingredientName)}`)
      const data = await res.json()
      if (data.found) setExplorerPairings(data.pairings)
    } finally { setExplorerLoading(false) }
  }

  function closeExplorer() {
    setExplorerIngredient(null)
    setExplorerPairings([])
  }

  if (explorerIngredient !== null) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>
        <div style={{ padding: '18px 32px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
          <button
            onClick={closeExplorer}
            style={{
              background: 'none', border: '1px solid var(--line)', borderRadius: 999,
              color: 'var(--ink-2)', cursor: 'pointer', fontSize: 13, fontWeight: 500,
              padding: '7px 14px', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            ← Back to results
          </button>
          <div>
            <p className="eyebrow" style={{ marginBottom: 2 }}>Pairing Explorer</p>
            <h2 style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 24, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
              {explorerIngredient}
            </h2>
          </div>
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', flexWrap: 'wrap' }}>
            {selectedTags.map(tag => {
              const cat = Object.entries(TAG_LIBRARY).find(([, tags]) => tags.includes(tag))?.[0]
              const color = cat ? CATEGORY_COLORS[cat] : 'var(--ink-4)'
              return (
                <span key={tag} style={{
                  padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                  background: `${color}18`, color, border: `1px solid ${color}40`,
                }}>
                  {tag}
                </span>
              )
            })}
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'hidden' }}>
          {explorerLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, color: 'var(--ink-3)' }}>
              <div style={{ width: 18, height: 18, border: '2px solid var(--line)', borderTopColor: 'var(--green)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
              Loading pairings...
            </div>
          ) : (
            <PairingGraph
              ingredient={explorerIngredient}
              pairings={explorerPairings}
              sessionId={null}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>

      {/* Left: tag browser */}
      <div style={{ width: 280, flexShrink: 0, borderRight: '1px solid var(--line)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '24px 20px 14px', borderBottom: '1px solid var(--line)' }}>
          <p className="eyebrow" style={{ marginBottom: 6 }}>Flavor Tags</p>
          <h1 style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 22, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
            Browse by Flavor
          </h1>
        </div>

        {selectedTags.length > 0 && (
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--line)', background: 'var(--surface-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-4)' }}>Active</span>
              <button onClick={() => { setSelectedTags([]); setResults([]); setHasSearched(false) }} style={{ background: 'none', border: 'none', color: 'var(--coral)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                Clear
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {selectedTags.map(tag => (
                <span key={tag} onClick={() => toggleTag(tag)} style={{
                  padding: '3px 10px', borderRadius: 999, background: 'var(--green)', color: '#FBF7F0',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  {tag} <span style={{ opacity: 0.8 }}>×</span>
                </span>
              ))}
            </div>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
          {Object.entries(TAG_LIBRARY).map(([category, tags]) => {
            const color = CATEGORY_COLORS[category]
            return (
              <div key={category} style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color, marginBottom: 8 }}>
                  {category}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {tags.map(tag => {
                    const active = selectedTags.includes(tag)
                    return (
                      <button key={tag} onClick={() => toggleTag(tag)} style={{
                        padding: '5px 12px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
                        border: `1px solid ${active ? color : 'var(--line)'}`,
                        background: active ? `${color}18` : 'transparent',
                        color: active ? color : 'var(--ink-3)',
                        fontSize: 12, fontWeight: active ? 700 : 400, transition: 'all 0.13s',
                      }}>
                        {tag}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Right: results */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 36px' }}>
        {!hasSearched && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 14, textAlign: 'center' }}>
            <span style={{ fontSize: 48 }}>🏷️</span>
            <h2 style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 24, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
              Select flavor tags
            </h2>
            <p style={{ color: 'var(--ink-4)', fontSize: 14, maxWidth: 280, lineHeight: 1.6, margin: 0 }}>
              Pick tags to find ingredients with those flavor characteristics. Multi-select narrows results.
            </p>
          </div>
        )}

        {searching && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--ink-3)', paddingTop: 40 }}>
            <div style={{ width: 16, height: 16, border: '2px solid var(--line)', borderTopColor: 'var(--green)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            Searching...
          </div>
        )}

        {hasSearched && !searching && results.length === 0 && (
          <div style={{ paddingTop: 40, textAlign: 'center' }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>🔎</p>
            <h3 style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>
              No ingredients found
            </h3>
            <p style={{ color: 'var(--ink-4)', fontSize: 14 }}>Try fewer tags.</p>
          </div>
        )}

        {results.length > 0 && !searching && (
          <>
            <div style={{ marginBottom: 20 }}>
              <p className="eyebrow" style={{ marginBottom: 4 }}>Results</p>
              <h2 style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 28, fontWeight: 700, color: 'var(--ink)', margin: '0 0 4px' }}>
                {results.length.toLocaleString()} ingredient{results.length !== 1 ? 's' : ''}
              </h2>
              <p style={{ fontSize: 13, color: 'var(--ink-4)', margin: 0 }}>
                Tagged: {selectedTags.join(' · ')}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
              {results.map(ing => (
                <button
                  key={ing.name}
                  onClick={() => openExplorer(ing.name)}
                  style={{
                    textAlign: 'left', padding: '14px 16px',
                    background: 'var(--surface)', border: '1px solid var(--line)',
                    borderRadius: 14, cursor: 'pointer', width: '100%',
                    boxShadow: 'var(--soft-shadow)', transition: 'transform 0.15s, box-shadow 0.15s',
                  }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = '0 6px 24px rgba(60,40,20,0.08)' }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = ''; el.style.boxShadow = 'var(--soft-shadow)' }}
                >
                  <h3 style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 15, fontWeight: 700, color: 'var(--ink)', margin: '0 0 8px' }}>
                    {ing.name}
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                    {ing.tags.slice(0, 4).map(tag => {
                      const isActive = selectedTags.includes(tag)
                      const cat = Object.entries(TAG_LIBRARY).find(([, tags]) => tags.includes(tag))?.[0]
                      const color = cat ? CATEGORY_COLORS[cat] : 'var(--ink-4)'
                      return (
                        <span key={tag} style={{
                          padding: '2px 7px', borderRadius: 999, fontSize: 10, fontWeight: isActive ? 700 : 500,
                          background: isActive ? `${color}18` : 'var(--surface-2)',
                          color: isActive ? color : 'var(--ink-4)',
                          border: `1px solid ${isActive ? `${color}40` : 'var(--line)'}`,
                        }}>
                          {tag}
                        </span>
                      )
                    })}
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600, margin: 0 }}>
                    Explore pairings →
                  </p>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
