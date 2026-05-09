'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Dish {
  id: string
  name: string
  category: string | null
  session_id: string | null
  notes: string | null
  created_at: string
}

interface Session {
  id: string
  name: string
}

interface NewDishModalProps {
  sessionId?: string
  onClose: () => void
  onCreated: (dish: Dish) => void
}

const CATEGORIES = [
  'Burgers', 'Sauces', 'Desserts', 'Mains', 'Sides',
  'Soups', 'Salads', 'Breakfast', 'Drinks', 'Snacks', 'Other',
]

export default function NewDishModal({ sessionId, onClose, onCreated }: NewDishModalProps) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [linkedSession, setLinkedSession] = useState<string>(sessionId || '')
  const [sessions, setSessions] = useState<Session[]>([])
  const [ingredientInput, setIngredientInput] = useState('')
  const [ingredients, setIngredients] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('sessions').select('id, name').eq('status', 'open').order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setSessions(data) })
  }, [])

  function addIngredient() {
    const val = ingredientInput.trim()
    if (!val || ingredients.includes(val)) return
    setIngredients(prev => [...prev, val])
    setIngredientInput('')
  }

  function removeIngredient(ing: string) {
    setIngredients(prev => prev.filter(i => i !== ing))
  }

  async function handleCreate() {
    if (!name.trim()) return
    setLoading(true)
    setError(null)

    try {
      const { data: dish, error: dishErr } = await supabase
        .from('dishes')
        .insert({
          name: name.trim(),
          category: category || null,
          session_id: linkedSession || null,
          notes: notes || null,
        })
        .select()
        .single()

      if (dishErr) throw dishErr

      if (ingredients.length > 0) {
        const { error: ingErr } = await supabase
          .from('dish_ingredients')
          .insert(ingredients.map(ing => ({
            dish_id: dish.id,
            ingredient_name: ing,
            tags: [],
          })))
        if (ingErr) throw ingErr
      }

      onCreated(dish)
    } catch (err) {
      console.error(err)
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 100 }} />

      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        zIndex: 101, background: 'var(--bg-panel)',
        borderRadius: '20px 20px 0 0',
        padding: '28px 24px 40px',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.4)',
        animation: 'slideUp 0.3s ease',
        maxWidth: 600, margin: '0 auto',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <style>{`@keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>

        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 24px' }} />

        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
          Log a Dish
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24 }}>
          Add a dish to your personal library.
        </p>

        <Field label="Dish name *">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Wagyu Brisket Burger"
            style={inputStyle}
          />
        </Field>

        <Field label="Category">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(category === cat ? '' : cat)}
                style={{
                  padding: '6px 14px', borderRadius: 20,
                  border: `1px solid ${category === cat ? 'var(--accent-green)' : 'var(--border)'}`,
                  background: category === cat ? 'rgba(90,158,48,0.12)' : 'var(--bg-secondary)',
                  color: category === cat ? 'var(--accent-green)' : 'var(--text-secondary)',
                  fontSize: 13, fontWeight: category === cat ? 600 : 400,
                  cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Ingredients">
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input
              value={ingredientInput}
              onChange={e => setIngredientInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addIngredient()}
              placeholder="Type ingredient + Enter"
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              onClick={addIngredient}
              style={{
                padding: '12px 16px', borderRadius: 12,
                background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                color: 'var(--text-secondary)', cursor: 'pointer',
                fontSize: 18, fontFamily: 'DM Sans, sans-serif',
              }}
            >
              +
            </button>
          </div>
          {ingredients.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {ingredients.map(ing => (
                <span key={ing} style={{ padding: '5px 12px', borderRadius: 20, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {ing}
                  <button onClick={() => removeIngredient(ing)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
                </span>
              ))}
            </div>
          )}
        </Field>

        {!sessionId && sessions.length > 0 && (
          <Field label="Link to session (optional)">
            <select value={linkedSession} onChange={e => setLinkedSession(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">No session</option>
              {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
        )}

        <Field label="Notes (optional)">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Describe the dish, technique, inspiration..."
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </Field>

        {error && <p style={{ color: 'var(--accent-coral)', fontSize: 13, marginBottom: 16 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 14, borderRadius: 12, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            style={{ flex: 2, padding: 14, borderRadius: 12, border: 'none', background: loading || !name.trim() ? 'var(--border)' : 'var(--accent-green)', color: '#F5F0E8', fontSize: 15, fontWeight: 600, cursor: loading || !name.trim() ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}
          >
            {loading ? 'Saving...' : 'Log Dish'}
          </button>
        </div>
      </div>
    </>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 16px',
  borderRadius: 12, border: '1px solid var(--border)',
  background: 'var(--bg-secondary)', color: 'var(--text-primary)',
  fontSize: 14, fontFamily: 'DM Sans, sans-serif', outline: 'none',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
        {label}
      </p>
      {children}
    </div>
  )
}
