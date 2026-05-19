'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// ─── Two usage modes ───────────────────────────────────────────────────────────
//
// Mode A — from Sessions page (no ingredients, just title + goal):
//   <NewSessionModal onClose={fn} onCreate={async (title, goal) => {...}} />
//
// Mode B — from PairingGraph (ingredients pre-filled):
//   <NewSessionModal ingredientA="Egusi" allIngredients={[...]} onClose={fn} />

interface NewSessionModalProps {
  // Mode A
  onCreate?: (title: string, goal?: string) => Promise<void>
  // Mode B (legacy PairingGraph path)
  ingredientA?: string
  ingredientB?: string
  allIngredients?: string[]
  // Shared
  onClose: () => void
}

const PRESET_CATEGORIES = [
  'Burgers', 'Sauces', 'Desserts', 'Mains', 'Sides',
  'Soups', 'Salads', 'Breakfast', 'Drinks', 'Snacks', 'Other',
]

async function fetchIngredientTags(ingredientNames: string[]): Promise<string[]> {
  try {
    const res = await fetch('/api/ingredients/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredients: ingredientNames }),
    })
    const data = await res.json()
    return data.tags ?? []
  } catch {
    return []
  }
}

export default function NewSessionModal({
  onCreate,
  ingredientA,
  ingredientB,
  allIngredients,
  onClose,
}: NewSessionModalProps) {
  const router = useRouter()

  // Determine mode
  const isIngredientMode = !!ingredientA
  const ingredients = isIngredientMode
    ? (allIngredients ?? [ingredientA!, ...(ingredientB ? [ingredientB] : [])])
    : []

  const [title, setTitle] = useState(
    isIngredientMode
      ? ingredients.length <= 2
        ? ingredients.join(' + ')
        : `${ingredientA} + ${ingredients.length - 1} more`
      : ''
  )
  const [goal, setGoal]             = useState('')
  const [selectedCat, setSelectedCat] = useState('')
  const [categories, setCategories] = useState<string[]>(PRESET_CATEGORIES)
  const [addingCat, setAddingCat]   = useState(false)
  const [newCatInput, setNewCatInput] = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)

  function commitNewCategory() {
    const val = newCatInput.trim()
    if (!val) return
    if (!categories.includes(val)) setCategories(prev => [...prev, val])
    setSelectedCat(val)
    setNewCatInput('')
    setAddingCat(false)
  }

  async function handleCreate() {
    if (!title.trim()) return
    setLoading(true)
    setError(null)

    try {
      // ── Mode A: delegate to parent onCreate ──────────────────────────
      if (onCreate) {
        await onCreate(title.trim(), goal.trim() || undefined)
        onClose()
        return
      }

      // ── Mode B: legacy ingredient-based session creation ─────────────
      const { data: { user }, error: userErr } = await supabase.auth.getUser()
      if (userErr || !user) throw new Error('Not authenticated. Please sign in.')

      const { data: session, error: sErr } = await supabase
        .from('sessions')
        .insert({
          name:      title.trim(),
          category:  selectedCat || null,
          status:    'open',
          user_id:   user.id,
        })
        .select()
        .single()
      if (sErr) throw sErr

      const { error: ingErr } = await supabase
        .from('session_ingredients')
        .insert(ingredients.map(n => ({ session_id: session.id, ingredient_name: n })))
      if (ingErr) throw ingErr

      const tags = await fetchIngredientTags(ingredients)
      if (tags.length > 0) {
        const uniqueTags = [...new Set(tags)]
        await supabase.from('session_tags').insert(
          uniqueTags.map(tag => ({ session_id: session.id, tag_name: tag, source: 'auto' }))
        )
      }

      router.push(`/sessions/${session.id}`)
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.'
      console.error(err)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(4px)',
          zIndex: 100,
        }}
      />

      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 101,
        background: 'var(--surface)',
        borderRadius: '20px 20px 0 0',
        padding: '24px 24px 40px',
        maxWidth: 560, margin: '0 auto',
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
        animation: 'slideUp 0.3s ease',
      }}>
        <style>{`
          @keyframes slideUp {
            from { transform: translateY(100%); opacity: 0 }
            to   { transform: translateY(0);    opacity: 1 }
          }
        `}</style>

        {/* Handle */}
        <div style={{
          width: 40, height: 4, borderRadius: 2,
          background: 'var(--line-2)', margin: '0 auto 22px',
        }} />

        <h2 style={{
          fontFamily: 'Fraunces, Georgia, serif',
          fontSize: 24, fontWeight: 700,
          color: 'var(--ink)', marginBottom: 4,
        }}>
          {isIngredientMode ? 'Start a Session' : 'New Session'}
        </h2>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 20 }}>
          {isIngredientMode
            ? 'Your R&D workspace for this flavor combination.'
            : 'Create a new culinary R&D canvas.'}
        </p>

        {/* Ingredients (Mode B only) */}
        {isIngredientMode && (
          <SField label="Starting ingredients">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 8 }}>
              {ingredients.map(ing => (
                <span key={ing} style={{
                  padding: '5px 13px', borderRadius: 999,
                  background: 'var(--green-soft)', color: 'var(--green-deep)',
                  fontSize: 13, fontWeight: 600,
                }}>
                  {ing}
                </span>
              ))}
            </div>
          </SField>
        )}

        {/* Title */}
        <SField label={isIngredientMode ? 'Session name' : 'Title'}>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={isIngredientMode ? 'Name your session...' : 'e.g. Smoked Egusi Broth'}
            className="input-text"
            style={{ marginTop: 8 }}
            autoFocus={!isIngredientMode}
          />
        </SField>

        {/* Goal (Mode A only) */}
        {!isIngredientMode && (
          <SField label="Goal / Hypothesis">
            <input
              value={goal}
              onChange={e => setGoal(e.target.value)}
              placeholder="What are you trying to achieve? (optional)"
              className="input-text"
              style={{ marginTop: 8 }}
            />
          </SField>
        )}

        {/* Category */}
        <SField label="Category">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 8 }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCat(selectedCat === cat ? '' : cat)}
                style={{
                  padding: '6px 14px', borderRadius: 999,
                  cursor: 'pointer', fontFamily: 'inherit',
                  border: `1px solid ${selectedCat === cat ? 'var(--green)' : 'var(--line)'}`,
                  background: selectedCat === cat ? 'var(--green-soft)' : 'transparent',
                  color: selectedCat === cat ? 'var(--green-deep)' : 'var(--ink-3)',
                  fontSize: 13, fontWeight: selectedCat === cat ? 600 : 400,
                  transition: 'all 0.13s',
                }}
              >
                {cat}
              </button>
            ))}

            {addingCat ? (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  autoFocus
                  value={newCatInput}
                  onChange={e => setNewCatInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitNewCategory()
                    if (e.key === 'Escape') setAddingCat(false)
                  }}
                  placeholder="New category..."
                  style={{
                    padding: '6px 12px', borderRadius: 999, width: 140,
                    border: '1px solid var(--green)', outline: 'none',
                    background: 'var(--bg)', color: 'var(--ink)',
                    fontSize: 13, fontFamily: 'inherit',
                  }}
                />
                <button onClick={commitNewCategory} style={{
                  padding: '6px 12px', borderRadius: 999,
                  background: 'var(--green)', color: '#FBF7F0',
                  border: 'none', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                }}>Add</button>
                <button onClick={() => setAddingCat(false)} style={{
                  padding: '6px 10px', borderRadius: 999,
                  background: 'transparent', border: '1px solid var(--line)',
                  color: 'var(--ink-3)', fontSize: 12, cursor: 'pointer',
                }}>×</button>
              </div>
            ) : (
              <button onClick={() => setAddingCat(true)} style={{
                padding: '6px 13px', borderRadius: 999,
                fontFamily: 'inherit', cursor: 'pointer',
                border: '1px dashed var(--line-2)', background: 'transparent',
                color: 'var(--ink-3)', fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <span style={{ fontSize: 15, lineHeight: 1 }}>+</span> New category
              </button>
            )}
          </div>
        </SField>

        {error && (
          <p style={{ color: 'var(--coral)', fontSize: 13, marginBottom: 14 }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: 14, borderRadius: 14,
            border: '1px solid var(--line)', background: 'transparent',
            color: 'var(--ink-2)', fontSize: 15, fontWeight: 500,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !title.trim()}
            style={{
              flex: 2, padding: 14, borderRadius: 14, border: 'none',
              background: loading || !title.trim() ? 'var(--line)' : 'var(--green)',
              color: '#FBF7F0', fontSize: 15, fontWeight: 600,
              cursor: loading || !title.trim() ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', transition: 'background 0.15s',
            }}
          >
            {loading ? 'Creating...' : isIngredientMode ? 'Start Session' : 'Create Session'}
          </button>
        </div>
      </div>
    </>
  )
}

function SField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
        textTransform: 'uppercase', color: 'var(--ink-3)', margin: 0,
      }}>
        {label}
      </p>
      {children}
    </div>
  )
}