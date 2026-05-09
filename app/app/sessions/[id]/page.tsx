'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import dynamic from 'next/dynamic'
import NewDishModal from '@/components/NewDishModal'

const PairingGraph = dynamic(() => import('@/components/PairingGraph'), { ssr: false })

interface Session { id: string; name: string; status: string; category: string | null; notes: string | null; created_at: string }
interface SessionIngredient { id: string; ingredient_name: string }
interface Pairing { name: string; score: number; emphasis: boolean }
interface Dish { id: string; name: string; category: string | null; created_at: string }
interface SessionTag { id: string; tag_name: string; source: string }

const ALL_TAGS: Record<string, string[]> = {
  'Flavor Profile': ['Umami', 'Sweet', 'Salty', 'Sour', 'Bitter', 'Savory', 'Funky', 'Fermented'],
  'Aromatic':       ['Smoky', 'Earthy', 'Floral', 'Herbaceous', 'Citrus-forward', 'Bright', 'Toasty', 'Nutty', 'Pungent'],
  'Texture':        ['Rich', 'Fatty', 'Creamy', 'Crispy', 'Silky', 'Crunchy', 'Tender'],
  'Heat':           ['Mild', 'Medium heat', 'Spicy', 'Fiery', 'Bold', 'Subtle'],
}
const TAG_COLORS: Record<string, string> = {
  'Flavor Profile': '#2F5D3A',
  'Aromatic':       '#C8923A',
  'Texture':        '#6B5B8A',
  'Heat':           '#C56B4F',
}

async function fetchPairings(name: string): Promise<{ pairings: Pairing[]; found: boolean; ingredient: string }> {
  const res = await fetch(`/api/ingredient/${encodeURIComponent(name)}`)
  return res.json()
}

export default function SessionPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id as string

  const [session, setSession] = useState<Session | null>(null)
  const [ingredients, setIngredients] = useState<SessionIngredient[]>([])
  const [dishes, setDishes] = useState<Dish[]>([])
  const [sessionTags, setSessionTags] = useState<SessionTag[]>([])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showNewDish, setShowNewDish] = useState(false)
  const [showTagPicker, setShowTagPicker] = useState(false)

  // Graph state
  const [hubMode, setHubMode] = useState(true)
  const [hubPairings, setHubPairings] = useState<Pairing[]>([])
  const [hubLoading, setHubLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResult, setSearchResult] = useState<{ ingredient: string; pairings: Pairing[] } | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)

  useEffect(() => { loadAll() }, [sessionId])

  async function loadAll() {
    setLoading(true)
    const [{ data: s }, { data: ings }, { data: d }, { data: tags }] = await Promise.all([
      supabase.from('sessions').select('*').eq('id', sessionId).single(),
      supabase.from('session_ingredients').select('*').eq('session_id', sessionId).order('created_at'),
      supabase.from('dishes').select('*').eq('session_id', sessionId).order('created_at', { ascending: false }),
      supabase.from('session_tags').select('*').eq('session_id', sessionId),
    ])
    if (s) { setSession(s); setNotes(s.notes || '') }
    if (ings) setIngredients(ings)
    if (d) setDishes(d)
    if (tags) setSessionTags(tags)
    setLoading(false)
  }

  const refreshHub = useCallback(async (ings: SessionIngredient[]) => {
    if (ings.length === 0) { setHubPairings([]); return }
    setHubLoading(true)
    if (ings.length === 1) {
      const data = await fetchPairings(ings[0].ingredient_name)
      setHubPairings(data.pairings || [])
      setHubLoading(false)
      return
    }
    const { computeHubPairings } = await import('@/lib/hubUtils')
    const pairings = await computeHubPairings(ings.map(i => i.ingredient_name), true)
    const memberSet = new Set(ings.map(i => i.ingredient_name.toLowerCase()))
    setHubPairings(pairings.filter(p => !memberSet.has(p.name.toLowerCase())))
    setHubLoading(false)
  }, [])

  useEffect(() => { if (!loading && hubMode) refreshHub(ingredients) }, [ingredients, loading, hubMode])

  async function searchIngredient(name: string) {
    if (!name.trim()) return
    setSearchLoading(true)
    const data = await fetchPairings(name.trim())
    if (data.found) setSearchResult({ ingredient: data.ingredient, pairings: data.pairings })
    setSearchLoading(false)
  }

  async function addToHub(pairingNames: string[]) {
    const existing = new Set(ingredients.map(i => i.ingredient_name.toLowerCase()))
    const toAdd = pairingNames.filter(n => !existing.has(n.toLowerCase()))
    if (toAdd.length === 0) return
    const { data } = await supabase
      .from('session_ingredients')
      .insert(toAdd.map(n => ({ session_id: sessionId, ingredient_name: n })))
      .select()
    if (data) {
      const next = [...ingredients, ...data]
      setIngredients(next)
      if (hubMode) refreshHub(next)
    }
  }

  async function addSearchedIngredientToHub() {
    if (!searchResult) return
    await addToHub([searchResult.ingredient])
  }

  async function removeIngredient(id: string, name: string) {
    await supabase.from('session_ingredients').delete().eq('id', id)
    const next = ingredients.filter(i => i.id !== id)
    setIngredients(next)
    if (hubMode) refreshHub(next)
  }

  async function saveNotes() {
    if (!session) return
    setSaving(true)
    await supabase.from('sessions').update({ notes, updated_at: new Date().toISOString() }).eq('id', sessionId)
    setSaving(false)
  }

  async function closeSession() {
    await supabase.from('sessions').update({ status: 'closed', updated_at: new Date().toISOString() }).eq('id', sessionId)
    setSession(prev => prev ? { ...prev, status: 'closed' } : prev)
  }

  async function toggleSessionTag(tagName: string) {
    const existing = sessionTags.find(t => t.tag_name === tagName)
    if (existing) {
      await supabase.from('session_tags').delete().eq('id', existing.id)
      setSessionTags(prev => prev.filter(t => t.id !== existing.id))
    } else {
      const { data } = await supabase.from('session_tags')
        .insert({ session_id: sessionId, tag_name: tagName, source: 'manual' })
        .select().single()
      if (data) setSessionTags(prev => [...prev, data])
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--ink-3)' }}>
      <Spinner />
    </div>
  )
  if (!session) return <div style={{ padding: 40, color: 'var(--ink-3)' }}>Session not found.</div>

  const activeTagNames = new Set(sessionTags.map(t => t.tag_name))
  const graphIngredient = hubMode
    ? (ingredients[0]?.ingredient_name || 'Hub')
    : (searchResult?.ingredient || '')
  const graphPairings = hubMode ? hubPairings : (searchResult?.pairings || [])
  const graphLoading = hubMode ? hubLoading : searchLoading

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>

      {/* Left panel */}
      <div style={{ width: 320, flexShrink: 0, borderRight: '1px solid var(--line)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--line)' }}>
          <button onClick={() => router.push('/sessions')} style={{ background: 'none', border: 'none', color: 'var(--ink-4)', cursor: 'pointer', fontSize: 12, marginBottom: 8, padding: 0, fontFamily: 'inherit' }}>
            ← Sessions
          </button>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <h1 style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 19, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.2, margin: 0 }}>
              {session.name}
            </h1>
            <span className={`status-badge status-${session.status}`} style={{ flexShrink: 0, marginTop: 2 }}>
              {session.status === 'open' ? 'Open' : 'Closed'}
            </span>
          </div>
          <p style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 4 }}>
            {session.category && <span style={{ marginRight: 8 }}>🏷 {session.category}</span>}
            {new Date(session.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

          {/* Hub ingredients */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <SLabel>Flavor Hub · {ingredients.length}</SLabel>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ingredients.map(ing => (
                <div key={ing.id} style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '5px 10px', borderRadius: 999,
                  background: 'var(--surface-2)', border: '1px solid var(--line)',
                  fontSize: 12, fontWeight: 500, color: 'var(--ink-2)',
                }}>
                  <button
                    onClick={() => { setHubMode(false); searchIngredient(ing.ingredient_name); setSearchQuery(ing.ingredient_name) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontFamily: 'inherit', fontSize: 'inherit', padding: 0 }}
                  >
                    {ing.ingredient_name}
                  </button>
                  <button onClick={() => removeIngredient(ing.id, ing.ingredient_name)} style={{ background: 'none', border: 'none', color: 'var(--ink-4)', cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1 }}>×</button>
                </div>
              ))}
              {ingredients.length === 0 && <p style={{ fontSize: 12, color: 'var(--ink-4)' }}>No ingredients yet.</p>}
            </div>
          </div>

          {/* Session tags */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <SLabel>Tags · {sessionTags.length}</SLabel>
              <button onClick={() => setShowTagPicker(!showTagPicker)} style={{
                background: 'none', border: 'none', color: 'var(--green)', fontSize: 12,
                fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                {showTagPicker ? 'Done' : '+ Edit'}
              </button>
            </div>
            {!showTagPicker && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {sessionTags.length === 0 && <p style={{ fontSize: 12, color: 'var(--ink-4)' }}>No tags yet.</p>}
                {sessionTags.map(t => {
                  const cat = Object.entries(ALL_TAGS).find(([, tags]) => tags.includes(t.tag_name))?.[0]
                  const color = cat ? TAG_COLORS[cat] : 'var(--ink-3)'
                  return (
                    <span key={t.id} style={{
                      padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                      background: `${color}18`, color, border: `1px solid ${color}40`,
                    }}>
                      {t.tag_name}
                    </span>
                  )
                })}
              </div>
            )}
            {showTagPicker && (
              <div style={{ background: 'var(--bg)', borderRadius: 12, padding: '12px', border: '1px solid var(--line)' }}>
                {Object.entries(ALL_TAGS).map(([category, tags]) => {
                  const color = TAG_COLORS[category]
                  return (
                    <div key={category} style={{ marginBottom: 10 }}>
                      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color, marginBottom: 5 }}>{category}</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {tags.map(tag => {
                          const active = activeTagNames.has(tag)
                          return (
                            <button key={tag} onClick={() => toggleSessionTag(tag)} style={{
                              padding: '3px 10px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
                              border: `1px solid ${active ? color : 'var(--line)'}`,
                              background: active ? `${color}18` : 'transparent',
                              color: active ? color : 'var(--ink-3)',
                              fontSize: 11, fontWeight: active ? 700 : 400, transition: 'all 0.1s',
                            }}>{tag}</button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 20 }}>
            <SLabel>Notes</SLabel>
            <textarea
              value={notes} onChange={e => setNotes(e.target.value)} onBlur={saveNotes}
              placeholder="Add observations, ideas, ratios..."
              rows={4}
              style={{ width: '100%', marginTop: 8, padding: '10px 12px', borderRadius: 12, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)', fontSize: 13, lineHeight: 1.6, fontFamily: 'inherit', resize: 'vertical', outline: 'none' }}
            />
            {saving && <p style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 3 }}>Saving...</p>}
          </div>

          {/* Dishes */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <SLabel>Dishes · {dishes.length}</SLabel>
              <button onClick={() => setShowNewDish(true)} style={{
                background: 'none', border: 'none', color: 'var(--green)', fontSize: 12,
                fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 3,
              }}>
                + New Dish
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dishes.map(dish => (
                <button
                  key={dish.id}
                  onClick={() => router.push(`/sessions/${sessionId}/dishes/${dish.id}`)}
                  style={{
                    textAlign: 'left', padding: '12px 14px', borderRadius: 12,
                    border: '1px solid var(--line)', background: 'var(--bg)',
                    cursor: 'pointer', width: '100%', transition: 'all 0.15s',
                  }}
                >
                  {dish.category && (
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-4)', display: 'block', marginBottom: 3 }}>
                      {dish.category}
                    </span>
                  )}
                  <p style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 14, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
                    {dish.name}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--ink-4)', margin: '3px 0 0' }}>
                    {new Date(dish.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </button>
              ))}
              {dishes.length === 0 && (
                <p style={{ fontSize: 12, color: 'var(--ink-4)' }}>No dishes logged yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        {session.status === 'open' && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8 }}>
            <button onClick={() => setShowNewDish(true)} style={{
              flex: 1, padding: '10px', borderRadius: 12, border: 'none',
              background: 'var(--green)', color: '#FBF7F0',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              + Log Dish
            </button>
            <button onClick={closeSession} style={{
              padding: '10px 14px', borderRadius: 12, border: '1px solid var(--line)',
              background: 'transparent', color: 'var(--ink-3)',
              fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Close
            </button>
          </div>
        )}
      </div>

      {/* Right panel: graph */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Mode toggle + search */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ display: 'flex', borderRadius: 999, border: '1px solid var(--line)', overflow: 'hidden', flexShrink: 0 }}>
            <button onClick={() => { setHubMode(true); refreshHub(ingredients) }} style={{
              padding: '7px 14px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: hubMode ? 'var(--green)' : 'transparent',
              color: hubMode ? '#FBF7F0' : 'var(--ink-3)',
              fontFamily: 'inherit', transition: 'all 0.15s',
            }}>Hub</button>
            <button onClick={() => setHubMode(false)} style={{
              padding: '7px 14px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: !hubMode ? 'var(--ink)' : 'transparent',
              color: !hubMode ? '#FBF7F0' : 'var(--ink-3)',
              fontFamily: 'inherit', transition: 'all 0.15s',
            }}>Search</button>
          </div>

          {!hubMode && (
            <div style={{ flex: 1, display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg)', border: '1px solid var(--line-2)', borderRadius: 999, padding: '0 14px' }}>
                <span style={{ color: 'var(--ink-4)', fontSize: 14 }}>⌕</span>
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchIngredient(searchQuery)}
                  placeholder="Search ingredient database..."
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--ink)', padding: '10px 0', fontFamily: 'inherit' }}
                />
              </div>
              <button onClick={() => searchIngredient(searchQuery)} disabled={searchLoading} style={{
                padding: '10px 16px', background: 'var(--green)', color: '#FBF7F0',
                border: 'none', borderRadius: 999, fontSize: 13, fontWeight: 600,
                cursor: searchLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              }}>
                {searchLoading ? '...' : 'Search'}
              </button>
              {searchResult && !ingredients.some(i => i.ingredient_name.toLowerCase() === searchResult.ingredient.toLowerCase()) && (
                <button onClick={addSearchedIngredientToHub} style={{
                  padding: '10px 14px', background: 'var(--surface)', color: 'var(--ink-2)',
                  border: '1px solid var(--line)', borderRadius: 999, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                }}>
                  + Add {searchResult.ingredient}
                </button>
              )}
            </div>
          )}

          {hubMode && ingredients.length >= 2 && (
            <p style={{ fontSize: 12, color: 'var(--ink-4)', lineHeight: 1.4 }}>
              Common pairings across <strong style={{ color: 'var(--ink-2)' }}>{ingredients.map(i => i.ingredient_name).join(', ')}</strong>
            </p>
          )}
        </div>

        {/* Graph */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {graphLoading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, color: 'var(--ink-3)' }}>
              <Spinner /> Computing pairings...
            </div>
          )}
          {!graphLoading && !graphIngredient && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: 'var(--ink-4)', textAlign: 'center', padding: 40 }}>
              <span style={{ fontSize: 36 }}>🌿</span>
              <p style={{ fontSize: 14, maxWidth: 260, lineHeight: 1.6 }}>
                {hubMode ? 'Add ingredients to your hub to see common pairings.' : 'Search an ingredient to explore its pairings.'}
              </p>
            </div>
          )}
          {!graphLoading && graphIngredient && graphPairings.length > 0 && (
            <PairingGraph
              ingredient={graphIngredient}
              pairings={graphPairings}
              sessionId={sessionId}
              onAddToSession={addToHub}
            />
          )}
          {!graphLoading && graphIngredient && graphPairings.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: 'var(--ink-4)', textAlign: 'center', padding: 40 }}>
              <span style={{ fontSize: 36 }}>🔎</span>
              <p style={{ fontSize: 14, maxWidth: 280, lineHeight: 1.6 }}>No common pairings found. Try removing an ingredient from the hub or searching individually.</p>
            </div>
          )}
        </div>
      </div>

      {showNewDish && (
        <NewDishModal
          sessionId={sessionId}
          onClose={() => setShowNewDish(false)}
          onCreated={(dish) => {
            setDishes(prev => [dish, ...prev])
            setShowNewDish(false)
          }}
        />
      )}
    </div>
  )
}

function SLabel({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)', margin: 0 }}>{children}</p>
}
function Spinner() {
  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <div style={{ width: 18, height: 18, border: '2px solid var(--line)', borderTopColor: 'var(--green)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </>
  )
}
