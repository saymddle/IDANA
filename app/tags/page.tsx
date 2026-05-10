'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Icon } from '@/components/Icons'

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
              background: 'none', border: '1px solid var(--line-strong)', borderRadius: 999,
              color: 'var(--ink-soft)', cursor: 'pointer', fontSize: 13, fontWeight: 500,
              padding: '7px 14px', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <Icon.ArrowLeft size={14} stroke="var(--ink-soft)" /> Back to results
          </button>
          <div>
            <p className="eyebrow" style={{ marginBottom: 2 }}>Pairing Explorer</p>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 400, color: 'var(--ink)', margin: 0 }}>
              {explorerIngredient}
            </h2>
          </div>
          {selectedTags.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', flexWrap: 'wrap' }}>
              {selectedTags.map(tag => {
                const cat = Object.entries(TAG_LIBRARY).find(([, tags]) => tags.includes(tag))?.[0]
                const color = cat ? CATEGORY_COLORS[cat] : 'var(--muted)'
                return (
                  <span key={tag} className="chip" style={{ height: 26, fontSize: 11, color, borderColor: `${color}40`, background: `${color}18` }}>
                    {tag}
                  </span>
                )
              })}
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflow: 'hidden' }}>
          {explorerLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, color: 'var(--muted)' }}>
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
    <div style={{ background: 'var(--bg)', minHeight: '100vh', padding: '32px 36px 80px' }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <p className="eyebrow" style={{ marginBottom: 8 }}>Library</p>
        <h1 className="h-section" style={{ marginBottom: 8 }}>Browse by flavor</h1>
        <p className="body-sm">Select flavor tags to find matching ingredients. Multi-select narrows results.</p>
      </div>

      {/* Active tags summary */}
      {selectedTags.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          padding: '12px 16px', marginBottom: 24,
          background: 'var(--tier-strong-tint-soft)',
          border: '1px solid var(--tier-strong-tint)',
          borderRadius: 14,
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--green)', flexShrink: 0 }}>
            Filtering by
          </span>
          {selectedTags.map(tag => (
            <button key={tag} onClick={() => toggleTag(tag)} className="chip is-active" style={{ height: 26, fontSize: 11 }}>
              {tag} <Icon.Close size={10} stroke="#FBF8F2" />
            </button>
          ))}
          <button onClick={() => { setSelectedTags([]); setResults([]); setHasSearched(false) }}
            style={{ background: 'none', border: 'none', color: 'var(--tier-twist)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginLeft: 'auto' }}
          >
            Clear all
          </button>
        </div>
      )}

      {/* Tag groups */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28, marginBottom: 40 }}>
        {Object.entries(TAG_LIBRARY).map(([category, tags]) => {
          const color = CATEGORY_COLORS[category]
          const activeInCat = tags.filter(t => selectedTags.includes(t)).length
          return (
            <div key={category}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span className="eyebrow" style={{ color, flexShrink: 0 }}>{category}</span>
                <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
                {activeInCat > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 600, color, flexShrink: 0 }}>{activeInCat} active</span>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {tags.map(tag => {
                  const active = selectedTags.includes(tag)
                  return (
                    <button key={tag} onClick={() => toggleTag(tag)}
                      className={`chip ${active ? 'is-active' : 'is-soft'}`}
                      style={{ cursor: 'pointer', ...(active ? {} : { borderColor: `${color}30`, color }) }}
                    >
                      {tag}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Results */}
      {searching && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--muted)', paddingTop: 20 }}>
          <div style={{ width: 16, height: 16, border: '2px solid var(--line)', borderTopColor: 'var(--green)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          Searching...
        </div>
      )}

      {hasSearched && !searching && results.length === 0 && (
        <div style={{ paddingTop: 20, textAlign: 'center' }}>
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 400, color: 'var(--ink)', marginBottom: 8 }}>
            No ingredients found
          </h3>
          <p className="body-sm">Try fewer or different tags.</p>
        </div>
      )}

      {results.length > 0 && !searching && (
        <>
          <div style={{ marginBottom: 18 }}>
            <p className="eyebrow" style={{ marginBottom: 4 }}>Results</p>
            <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 400, fontSize: 26, color: 'var(--ink)', margin: '0 0 4px' }}>
              {results.length.toLocaleString()} ingredient{results.length !== 1 ? 's' : ''}
            </h2>
            <p className="body-sm">Tagged: {selectedTags.join(' · ')}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
            {results.map(ing => (
              <button
                key={ing.name}
                onClick={() => openExplorer(ing.name)}
                style={{
                  textAlign: 'left', padding: '14px 16px',
                  background: 'var(--card)', border: '1px solid var(--line)',
                  borderRadius: 16, cursor: 'pointer', width: '100%',
                  boxShadow: 'var(--shadow-1)', transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = 'var(--shadow-2)' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = ''; el.style.boxShadow = 'var(--shadow-1)' }}
              >
                <h3 style={{ fontFamily: 'var(--serif)', fontSize: 15, fontWeight: 400, color: 'var(--ink)', margin: '0 0 8px' }}>
                  {ing.name}
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                  {ing.tags.slice(0, 4).map(tag => {
                    const isActive = selectedTags.includes(tag)
                    const cat = Object.entries(TAG_LIBRARY).find(([, tags]) => tags.includes(tag))?.[0]
                    const color = cat ? CATEGORY_COLORS[cat] : 'var(--muted)'
                    return (
                      <span key={tag} className="chip" style={{
                        height: 22, fontSize: 10, padding: '0 8px',
                        background: isActive ? `${color}18` : 'var(--card-soft)',
                        color: isActive ? color : 'var(--muted)',
                        borderColor: isActive ? `${color}40` : 'var(--line)',
                      }}>
                        {tag}
                      </span>
                    )
                  })}
                </div>
                <p style={{ fontSize: 11, color: 'var(--green)', fontWeight: 500, margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                  Explore pairings <Icon.ChevronRight size={12} stroke="var(--green)" />
                </p>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
