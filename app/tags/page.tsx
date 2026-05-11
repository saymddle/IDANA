'use client'

import { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Icon } from '@/components/Icons'
import { supabase } from '@/lib/supabase'

const PairingGraph = dynamic(() => import('@/components/PairingGraph'), { ssr: false })

interface IngredientResult { name: string; tags: string[] }
interface Pairing { name: string; score: number; emphasis: boolean }
interface CustomTag { id: string; name: string; color: string; created_at: string }

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
const PRESET_COLORS = ['#2F5D3A', '#C8923A', '#6B5B8A', '#C56B4F', '#4A7BB5', '#8B6F4E']

export default function TagsPage() {
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [results, setResults] = useState<IngredientResult[]>([])
  const [searching, setSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const [explorerIngredient, setExplorerIngredient] = useState<string | null>(null)
  const [explorerPairings, setExplorerPairings] = useState<Pairing[]>([])
  const [explorerLoading, setExplorerLoading] = useState(false)

  // Custom tags
  const [customTags, setCustomTags] = useState<CustomTag[]>([])

  // Create tag form
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[0])
  const [createError, setCreateError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    supabase.from('tags').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setCustomTags(data as CustomTag[]) })
  }, [])

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

  async function handleCreateTag() {
    const name = newTagName.trim()
    if (!name) { setCreateError('Tag name is required.'); return }
    const allExisting = [
      ...Object.values(TAG_LIBRARY).flat(),
      ...customTags.map(t => t.name),
    ]
    if (allExisting.some(t => t.toLowerCase() === name.toLowerCase())) {
      setCreateError('A tag with this name already exists.')
      return
    }
    setCreating(true)
    setCreateError(null)
    const { data, error } = await supabase
      .from('tags')
      .insert({ name, color: newTagColor })
      .select()
      .single()
    setCreating(false)
    if (error) { setCreateError('Could not save tag. Please try again.'); return }
    setCustomTags(prev => [data as CustomTag, ...prev])
    setShowCreateForm(false)
    setNewTagName('')
    setNewTagColor(PRESET_COLORS[0])
  }

  function cancelCreate() {
    setShowCreateForm(false)
    setNewTagName('')
    setNewTagColor(PRESET_COLORS[0])
    setCreateError(null)
  }

  // ── Explorer (full-screen PairingGraph) ──────────────────────────────────
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
                const customTag = customTags.find(t => t.name === tag)
                const color = cat ? CATEGORY_COLORS[cat] : customTag?.color ?? 'var(--muted)'
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
              Loading pairings…
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

  // ── Browse view ──────────────────────────────────────────────────────────
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', padding: '32px 36px 80px' }}>
      <style>{`@keyframes slideDown { from { opacity: 0; transform: translateY(-8px) } to { opacity: 1; transform: translateY(0) } }`}</style>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <p className="eyebrow" style={{ marginBottom: 8 }}>Library</p>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
          <h1 className="h-section">Browse by flavor</h1>
          <button
            onClick={() => { setShowCreateForm(p => !p); setCreateError(null) }}
            style={{
              background: 'none', border: 'none', color: 'var(--green)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit', flexShrink: 0, paddingTop: 4,
            }}
          >
            + Create Tag
          </button>
        </div>
        <p className="body-sm">Select flavor tags to find matching ingredients. Multi-select narrows results.</p>

        {/* Inline create form */}
        {showCreateForm && (
          <div style={{
            marginTop: 16, padding: '18px 20px',
            background: 'var(--surface)', borderRadius: 14,
            border: '1px solid var(--line)',
            animation: 'slideDown 0.2s ease',
          }}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)', display: 'block', marginBottom: 8 }}>
                Tag name
              </label>
              <input
                autoFocus
                value={newTagName}
                onChange={e => { setNewTagName(e.target.value); setCreateError(null) }}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateTag(); if (e.key === 'Escape') cancelCreate() }}
                placeholder="e.g. Citrusy, Briny, Smoky-sweet…"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10,
                  border: createError ? '1px solid var(--coral)' : '1px solid var(--line-2)',
                  background: 'var(--bg)', color: 'var(--ink)',
                  fontSize: 14, fontFamily: 'inherit', outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)', display: 'block', marginBottom: 8 }}>
                Color
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewTagColor(color)}
                    style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: color, cursor: 'pointer',
                      border: newTagColor === color ? `3px solid var(--ink)` : '3px solid transparent',
                      outline: newTagColor === color ? '2px solid var(--bg)' : 'none',
                      outlineOffset: '-5px',
                      transition: 'border-color 0.12s',
                    }}
                  />
                ))}
              </div>
            </div>

            {createError && (
              <p style={{ fontSize: 12, color: 'var(--coral)', marginBottom: 12 }}>{createError}</p>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={handleCreateTag}
                disabled={creating}
                style={{
                  padding: '9px 22px', borderRadius: 999, border: 'none',
                  background: creating ? 'var(--line)' : 'var(--green)',
                  color: '#FBF7F0', fontSize: 13, fontWeight: 600,
                  cursor: creating ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                  transition: 'background 0.15s',
                }}
              >
                {creating ? 'Saving…' : 'Save Tag'}
              </button>
              <button
                onClick={cancelCreate}
                style={{ background: 'none', border: 'none', color: 'var(--ink-3)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
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
          <button
            onClick={() => { setSelectedTags([]); setResults([]); setHasSearched(false) }}
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
                {activeInCat > 0 && <span style={{ fontSize: 11, fontWeight: 600, color, flexShrink: 0 }}>{activeInCat} active</span>}
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

        {/* Custom tags group */}
        {customTags.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <span className="eyebrow" style={{ color: 'var(--muted)', flexShrink: 0 }}>Custom</span>
              <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
              {customTags.filter(t => selectedTags.includes(t.name)).length > 0 && (
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', flexShrink: 0 }}>
                  {customTags.filter(t => selectedTags.includes(t.name)).length} active
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {customTags.map(tag => {
                const active = selectedTags.includes(tag.name)
                return (
                  <button key={tag.id} onClick={() => toggleTag(tag.name)}
                    className={`chip ${active ? 'is-active' : 'is-soft'}`}
                    style={{ cursor: 'pointer', ...(active ? {} : { borderColor: `${tag.color}30`, color: tag.color }) }}
                  >
                    {tag.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {searching && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--muted)', paddingTop: 20 }}>
          <div style={{ width: 16, height: 16, border: '2px solid var(--line)', borderTopColor: 'var(--green)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          Searching…
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
                    const customTag = customTags.find(t => t.name === tag)
                    const color = cat ? CATEGORY_COLORS[cat] : customTag?.color ?? 'var(--muted)'
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
