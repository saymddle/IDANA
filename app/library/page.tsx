'use client'

import { useState } from 'react'
import PairingGraph from '@/components/PairingGraph'

type LibraryTab = 'ingredients' | 'tags' | 'pairing'

interface Ingredient {
  name: string
  tags: string[]
  emphasis: boolean
}

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState<LibraryTab>('ingredients')
  const [search, setSearch] = useState('')
  const [selectedIngredient, setSelectedIngredient] = useState<string | null>(null)
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const loadIngredients = async () => {
    if (loaded) return
    setLoading(true)
    try {
      const [res, tagRes] = await Promise.all([
        fetch('/api/ingredients/by-tags?tags='),
        fetch('/api/ingredients/tags'),
      ])
      if (res.ok) {
        const data = await res.json()
        setIngredients(data.ingredients ?? [])
      }
      if (tagRes.ok) {
        const tagData = await tagRes.json()
        setTags(tagData.tags ?? [])
      }
      setLoaded(true)
    } finally {
      setLoading(false)
    }
  }

  const handleTabChange = (tab: LibraryTab) => {
    setActiveTab(tab)
    if (tab === 'ingredients' || tab === 'tags') loadIngredients()
  }

  const filteredIngredients = ingredients.filter(ing => {
    const matchSearch = !search || ing.name.toLowerCase().includes(search.toLowerCase())
    const matchTag = !activeTag || ing.tags?.includes(activeTag)
    return matchSearch && matchTag
  })

  const filteredTags = tags.filter(t =>
    !search || t.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="lib-root">
      <div className="lib-header">
        <h1 className="lib-title">Library</h1>
        <p className="lib-subtitle">Ingredients, flavor tags, and pairing explorer</p>
      </div>

      <div className="lib-tabs">
        {(['ingredients', 'tags', 'pairing'] as LibraryTab[]).map(tab => (
          <button
            key={tab}
            className={`lib-tab ${activeTab === tab ? 'lib-tab--active' : ''}`}
            onClick={() => handleTabChange(tab)}
          >
            {tab === 'ingredients' && '🌿 Ingredients'}
            {tab === 'tags'        && '⬡ Flavor Tags'}
            {tab === 'pairing'     && '↭ Pairing Explorer'}
          </button>
        ))}
      </div>

      {activeTab !== 'pairing' && (
        <div className="lib-search-wrap">
          <svg className="lib-search-icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M9.5 9.5l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <input
            className="lib-search"
            placeholder={activeTab === 'ingredients' ? 'Search ingredients...' : 'Search tags...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      )}

      {activeTab === 'ingredients' && (
        <div className="lib-content">
          {tags.length > 0 && (
            <div className="lib-tag-filters">
              <button
                className={`lib-tag-chip ${!activeTag ? 'lib-tag-chip--active' : ''}`}
                onClick={() => setActiveTag(null)}
              >
                All
              </button>
              {tags.slice(0, 20).map(tag => (
                <button
                  key={tag}
                  className={`lib-tag-chip ${activeTag === tag ? 'lib-tag-chip--active' : ''}`}
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="lib-loading">
              <div className="lib-spinner" />
              <span>Loading ingredients...</span>
            </div>
          ) : (
            <div className="lib-ing-grid">
              {filteredIngredients.map(ing => (
                <button
                  key={ing.name}
                  className={`lib-ing-card ${selectedIngredient === ing.name ? 'lib-ing-card--active' : ''} ${ing.emphasis ? 'lib-ing-card--emphasis' : ''}`}
                  onClick={() => {
                    setSelectedIngredient(ing.name)
                    setActiveTab('pairing')
                  }}
                >
                  <span className="lib-ing-name">{ing.name}</span>
                  {ing.tags?.length > 0 && (
                    <div className="lib-ing-tags">
                      {ing.tags.slice(0, 2).map(t => (
                        <span key={t} className="lib-ing-tag">{t}</span>
                      ))}
                    </div>
                  )}
                  <span className="lib-ing-arrow">→</span>
                </button>
              ))}
              {filteredIngredients.length === 0 && !loading && (
                <p className="lib-empty">No ingredients found.</p>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'tags' && (
        <div className="lib-content">
          {loading ? (
            <div className="lib-loading">
              <div className="lib-spinner" />
            </div>
          ) : (
            <div className="lib-tags-grid">
              {filteredTags.map(tag => (
                <button
                  key={tag}
                  className="lib-tag-card"
                  onClick={() => {
                    setActiveTag(tag)
                    setActiveTab('ingredients')
                  }}
                >
                  <span className="lib-tag-icon">⬡</span>
                  <span className="lib-tag-name">{tag}</span>
                  <span className="lib-tag-arrow">→</span>
                </button>
              ))}
              {filteredTags.length === 0 && (
                <p className="lib-empty">No tags found.</p>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'pairing' && (
        <div className="lib-pairing-wrap">
          <div className="lib-pairing-search-row">
            <input
              className="lib-pairing-input"
              placeholder="Enter an ingredient to explore pairings..."
              value={selectedIngredient ?? ''}
              onChange={e => setSelectedIngredient(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && selectedIngredient?.trim()) {
                  setSelectedIngredient(selectedIngredient.trim())
                }
              }}
            />
            <button
              className="lib-pairing-btn"
              onClick={() => selectedIngredient && setSelectedIngredient(selectedIngredient.trim())}
            >
              Explore
            </button>
          </div>

          <div className="lib-pairing-graph">
            {selectedIngredient ? (
              <PairingGraph
                ingredientName={selectedIngredient}
                key={selectedIngredient}
              />
            ) : (
              <div className="lib-pairing-empty">
                <span className="lib-pairing-empty-icon">⬡</span>
                <p className="lib-pairing-empty-text">
                  Search for an ingredient to explore its flavor relationships
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .lib-root {
          display: flex; flex-direction: column;
          height: 100vh; height: 100dvh;
          padding: 32px 32px 0;
          font-family: 'DM Sans', system-ui, sans-serif;
          overflow: hidden;
        }
        .lib-header { margin-bottom: 20px; flex-shrink: 0; }
        .lib-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 28px; font-weight: 600;
          color: #1C1A17; margin: 0 0 4px;
          letter-spacing: -0.01em;
        }
        .lib-subtitle { font-size: 13px; color: #9A8F80; margin: 0; }

        .lib-tabs { display: flex; gap: 4px; margin-bottom: 16px; flex-shrink: 0; }
        .lib-tab {
          font-size: 13px; font-weight: 500;
          padding: 8px 14px; border-radius: 10px;
          border: 1.5px solid #C4B9A8;
          background: transparent; color: #6B5D50;
          cursor: pointer; font-family: 'DM Sans', system-ui, sans-serif;
          transition: all 0.12s;
        }
        .lib-tab:hover { border-color: #8B5E3C; color: #8B5E3C; }
        .lib-tab--active { background: #1C1A17; color: #F2EBD9; border-color: #1C1A17; }

        .lib-search-wrap {
          position: relative; max-width: 400px; margin-bottom: 14px; flex-shrink: 0;
        }
        .lib-search-icon {
          position: absolute; left: 12px; top: 50%;
          transform: translateY(-50%); color: #9A8F80; pointer-events: none;
        }
        .lib-search {
          width: 100%; padding: 9px 12px 9px 34px;
          font-size: 13px; color: #1C1A17; background: #FDFAF4;
          border: 1.5px solid #C4B9A8; border-radius: 10px;
          outline: none; font-family: 'DM Sans', system-ui, sans-serif;
          transition: border-color 0.15s; box-sizing: border-box;
        }
        .lib-search:focus { border-color: #8B5E3C; }
        .lib-search::placeholder { color: #B0A090; }

        .lib-content { flex: 1; overflow-y: auto; padding-bottom: 32px; }
        .lib-content::-webkit-scrollbar { width: 4px; }
        .lib-content::-webkit-scrollbar-thumb { background: #C4B9A8; border-radius: 2px; }

        .lib-tag-filters { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 16px; }
        .lib-tag-chip {
          font-size: 11px; font-weight: 500;
          padding: 3px 10px; border-radius: 20px;
          border: 1.5px solid #C4B9A8;
          background: transparent; color: #6B5D50;
          cursor: pointer; transition: all 0.12s;
          font-family: 'DM Sans', system-ui, sans-serif;
        }
        .lib-tag-chip:hover { border-color: #8B5E3C; color: #8B5E3C; }
        .lib-tag-chip--active { background: #8B5E3C; color: #F2EBD9; border-color: #8B5E3C; }

        .lib-ing-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 8px;
        }
        .lib-ing-card {
          display: flex; flex-direction: column; gap: 5px;
          padding: 12px 14px; border-radius: 12px;
          border: 1.5px solid #C4B9A8; background: #FDFAF4;
          cursor: pointer; text-align: left;
          transition: all 0.12s; position: relative;
          font-family: 'DM Sans', system-ui, sans-serif;
        }
        .lib-ing-card:hover {
          border-color: #8B5E3C;
          box-shadow: 0 4px 12px rgba(60,40,20,0.08);
          transform: translateY(-1px);
        }
        .lib-ing-card--active { border-color: #C0394B; background: rgba(192,57,75,0.03); }
        .lib-ing-card--emphasis { border-color: #C89B3C; }
        .lib-ing-name {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 14px; font-weight: 600; color: #1C1A17;
        }
        .lib-ing-tags { display: flex; gap: 3px; flex-wrap: wrap; }
        .lib-ing-tag {
          font-size: 9px; font-weight: 500;
          background: rgba(139,94,60,0.08); color: #8B5E3C;
          border-radius: 20px; padding: 1px 6px;
        }
        .lib-ing-arrow {
          position: absolute; right: 12px; top: 50%;
          transform: translateY(-50%);
          font-size: 12px; color: #C4B9A8; transition: color 0.12s, right 0.12s;
        }
        .lib-ing-card:hover .lib-ing-arrow { color: #8B5E3C; right: 10px; }

        .lib-tags-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 8px;
        }
        .lib-tag-card {
          display: flex; align-items: center; gap: 8px;
          padding: 12px 14px; border-radius: 12px;
          border: 1.5px solid #C4B9A8; background: #FDFAF4;
          cursor: pointer; text-align: left; transition: all 0.12s;
          position: relative; font-family: 'DM Sans', system-ui, sans-serif;
        }
        .lib-tag-card:hover {
          border-color: #8B5E3C; transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(60,40,20,0.08);
        }
        .lib-tag-icon { font-size: 14px; color: #C89B3C; flex-shrink: 0; }
        .lib-tag-name {
          font-size: 13px; font-weight: 500; color: #1C1A17; flex: 1;
          font-family: 'Playfair Display', Georgia, serif;
        }
        .lib-tag-arrow { font-size: 11px; color: #C4B9A8; }
        .lib-tag-card:hover .lib-tag-arrow { color: #8B5E3C; }

        .lib-pairing-wrap {
          flex: 1; display: flex; flex-direction: column; gap: 12px; min-height: 0;
        }
        .lib-pairing-search-row { display: flex; gap: 8px; flex-shrink: 0; }
        .lib-pairing-input {
          flex: 1; max-width: 360px;
          font-size: 13px; color: #1C1A17; background: #FDFAF4;
          border: 1.5px solid #C4B9A8; border-radius: 10px;
          padding: 9px 12px; outline: none;
          font-family: 'DM Sans', system-ui, sans-serif;
          transition: border-color 0.15s;
        }
        .lib-pairing-input:focus { border-color: #C0394B; }
        .lib-pairing-input::placeholder { color: #B0A090; }
        .lib-pairing-btn {
          font-size: 13px; font-weight: 600;
          color: #F2EBD9; background: #C0394B;
          border: none; border-radius: 10px;
          padding: 9px 16px; cursor: pointer;
          font-family: 'DM Sans', system-ui, sans-serif;
          transition: background 0.15s;
        }
        .lib-pairing-btn:hover { background: #A02E3D; }

        .lib-pairing-graph {
          flex: 1; border-radius: 16px; overflow: hidden;
          min-height: 0; border: 1.5px solid #C4B9A8;
        }
        .lib-pairing-empty {
          width: 100%; height: 100%;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 12px;
          background: #F5EFE3;
        }
        .lib-pairing-empty-icon { font-size: 40px; color: #C4B9A8; }
        .lib-pairing-empty-text {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 14px; font-style: italic; color: #9A8F80;
          text-align: center; max-width: 260px; margin: 0;
        }

        .lib-loading {
          display: flex; align-items: center; gap: 10px;
          padding: 48px 0; color: #9A8F80; font-size: 13px;
        }
        .lib-spinner {
          width: 16px; height: 16px;
          border: 2px solid #C4B9A8; border-top-color: #8B5E3C;
          border-radius: 50%; animation: lib-spin 0.8s linear infinite;
        }
        @keyframes lib-spin { to { transform: rotate(360deg) } }

        .lib-empty {
          font-size: 13px; color: #B0A090; font-style: italic;
          font-family: 'Playfair Display', Georgia, serif;
          padding: 32px 0; text-align: center;
        }

        @media (max-width: 600px) {
          .lib-root { padding: 20px 16px 0; }
          .lib-ing-grid { grid-template-columns: 1fr 1fr; }
          .lib-tabs { overflow-x: auto; }
          .lib-tab { white-space: nowrap; }
        }
      `}</style>
    </div>
  )
}
