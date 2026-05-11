'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Icon, IDANAGlyph, IconProps } from '@/components/Icons'
import { computeHubPairings } from '@/lib/hubUtils'
import NewSessionModal from '@/components/NewSessionModal'

interface Pairing { name: string; score: number; emphasis: boolean }

interface PairingGraphProps {
  ingredientName?: string
  ingredient?: string
  pairings?: Pairing[]
  sessionId?: string | null
  onStartSession?: (ingredient: string, pairings: string[]) => void
  onAddToSession?: (pairings: string[]) => void
  onNodeSelect?: (name: string) => void
  onSelectionsChange?: (selected: Pairing[]) => void
}

type Tier = 'strong' | 'good' | 'twist'

const TIERS: Record<Tier, { label: string; color: string; tint: string; tintSoft: string }> = {
  strong: { label: 'Strong match',      color: 'var(--tier-strong)', tint: 'var(--tier-strong-tint)', tintSoft: 'var(--tier-strong-tint-soft)' },
  good:   { label: 'Good match',        color: 'var(--tier-good)',   tint: 'var(--tier-good-tint)',   tintSoft: 'var(--tier-good-tint-soft)'   },
  twist:  { label: 'Interesting twist', color: 'var(--tier-twist)',  tint: 'var(--tier-twist-tint)',  tintSoft: 'var(--tier-twist-tint-soft)'  },
}

const ICON_POOL = ['Leaf', 'Drop', 'Grid', 'Stripes', 'Wheat', 'Sparkles', 'Flame'] as const
type IconKey = typeof ICON_POOL[number]

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function iconFor(name: string) {
  return Icon[ICON_POOL[hashStr(name) % ICON_POOL.length] as IconKey]
}

function getTier(p: Pairing): Tier {
  if (p.emphasis || p.score >= 1.3) return 'strong'
  if (p.score >= 1.2) return 'good'
  return 'twist'
}

interface RingNode {
  pairing: Pairing
  tier: Tier
  x: number; y: number; r: number
}

function scoreToRadius(score: number, minScore: number, maxScore: number): number {
  if (maxScore === minScore) return 42
  const t = (score - minScore) / (maxScore - minScore)
  return Math.round(36 + t * 18)
}

function layoutRadial(
  pairings: Pairing[],
  density: number,
  w: number,
  h: number,
  useScoreRadius: boolean,
): { center: { x: number; y: number; r: number }; nodes: RingNode[] } {
  const groups: Record<Tier, Pairing[]> = { strong: [], good: [], twist: [] }
  for (const p of pairings) groups[getTier(p)].push(p)

  const ordered: (Pairing & { tier: Tier })[] = []
  ;(['strong', 'good', 'twist'] as Tier[]).forEach(tier =>
    groups[tier].forEach(p => ordered.push({ ...p, tier }))
  )
  const ring = ordered.slice(0, density)

  const cx = w / 2
  const cy = h / 2 - 8
  const centerR = Math.min(w, h) * 0.16
  const ringR = Math.min(w, h) * 0.40
  const N = ring.length
  const start = N > 0 ? -Math.PI / 2 - Math.PI / N : -Math.PI / 2

  let minScore = Infinity, maxScore = -Infinity
  if (useScoreRadius) {
    ring.forEach(p => {
      if (p.score < minScore) minScore = p.score
      if (p.score > maxScore) maxScore = p.score
    })
  }

  const nodes: RingNode[] = ring.map((p, i) => ({
    pairing: p,
    tier: p.tier,
    x: cx + Math.cos(start + (i * 2 * Math.PI) / N) * ringR,
    y: cy + Math.sin(start + (i * 2 * Math.PI) / N) * ringR,
    r: useScoreRadius
      ? scoreToRadius(p.score, minScore, maxScore)
      : (p.tier === 'strong' ? 44 : p.tier === 'good' ? 40 : 38),
  }))

  return { center: { x: cx, y: cy, r: centerR }, nodes }
}

export default function PairingGraph({
  ingredientName,
  ingredient,
  pairings: pairingsProp,
  sessionId = null,
  onStartSession,
  onAddToSession,
}: PairingGraphProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 700, h: 520 })
  const [fetchedIngredient, setFetchedIngredient] = useState<string | null>(null)
  const [fetchedPairings, setFetchedPairings] = useState<Pairing[]>([])
  const [fetching, setFetching] = useState(false)
  const [density, setDensity] = useState(8)

  // Selection + hub state
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [hubPairings, setHubPairings] = useState<Pairing[] | null>(null)
  const [hubLoading, setHubLoading] = useState(false)

  // Modal
  const [showModal, setShowModal] = useState(false)

  // Self-fetching mode
  useEffect(() => {
    if (!ingredientName) return
    setFetching(true)
    setFetchedIngredient(null)
    setFetchedPairings([])
    fetch(`/api/ingredient/${encodeURIComponent(ingredientName)}`)
      .then(r => r.json())
      .then(data => {
        if (data.found) { setFetchedIngredient(data.ingredient); setFetchedPairings(data.pairings) }
      })
      .finally(() => setFetching(false))
  }, [ingredientName])

  // ResizeObserver
  useEffect(() => {
    if (!wrapRef.current) return
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect
      setSize({ w: Math.max(width, 300), h: Math.max(height, 300) })
    })
    ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [])

  const basePairings = fetchedPairings.length > 0 ? fetchedPairings : (pairingsProp || [])
  const centerName = fetchedIngredient || ingredient || ingredientName || ''

  // Hub recomputation whenever selection changes
  const refreshHub = useCallback(async (sel: Set<string>) => {
    if (sel.size === 0) { setHubPairings(null); return }
    setHubLoading(true)
    try {
      const arr = Array.from(sel)
      let results: Pairing[]
      if (sel.size === 1) {
        const res = await fetch(`/api/ingredient/${encodeURIComponent(arr[0])}`)
        const data = await res.json()
        results = data.found ? data.pairings : []
      } else {
        results = await computeHubPairings(arr, true)
      }
      const selLower = new Set(arr.map(s => s.toLowerCase()))
      setHubPairings(results.filter(p => !selLower.has(p.name.toLowerCase())))
    } finally {
      setHubLoading(false)
    }
  }, [])

  function toggleSelected(name: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      refreshHub(next)
      return next
    })
  }

  const activePairings = hubPairings ?? basePairings
  const useScoreRadius = selected.size >= 2 && hubPairings !== null

  const centerLabel =
    selected.size === 0 ? centerName
    : selected.size === 1 ? Array.from(selected)[0]
    : `${selected.size} ingredients`

  const layout = useMemo(
    () => layoutRadial(activePairings, density, size.w, size.h, useScoreRadius),
    [activePairings, density, size.w, size.h, useScoreRadius]
  )

  const hidden = Math.max(0, activePairings.length - layout.nodes.length)
  const selectedArr = Array.from(selected)

  if (fetching) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, color: 'var(--muted)' }}>
        <div style={{ width: 18, height: 18, border: '2px solid var(--line)', borderTopColor: 'var(--green)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        Searching flavor graph...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      <div style={{ padding: '8px 16px 0', flexShrink: 0 }}>
        <TierLegend />
      </div>

      <div ref={wrapRef} style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        {/* Paper-grid background */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(circle at center, var(--bg) 0%, var(--bg-deep) 100%)',
          borderRadius: 20, overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'radial-gradient(rgba(28,28,26,0.05) 1px, transparent 1.4px)',
            backgroundSize: '14px 14px', backgroundPosition: '7px 7px',
            opacity: 0.6,
            maskImage: 'radial-gradient(circle at center, #000 50%, transparent 90%)',
            WebkitMaskImage: 'radial-gradient(circle at center, #000 50%, transparent 90%)',
          }} />
        </div>

        {/* Center node */}
        <div style={{
          position: 'absolute',
          left: layout.center.x - layout.center.r,
          top: layout.center.y - layout.center.r,
          width: layout.center.r * 2,
          height: layout.center.r * 2,
          borderRadius: '50%',
          background: 'var(--card-soft)',
          border: '1px solid var(--line)',
          boxShadow: 'var(--shadow-bubble), inset 0 0 0 6px rgba(255,255,255,0.6)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: 10, textAlign: 'center',
          transition: 'all 0.3s ease',
          zIndex: 5,
        }}>
          {hubLoading ? (
            <div style={{ width: 18, height: 18, border: '2px solid var(--line)', borderTopColor: 'var(--green)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          ) : (
            <>
              <div style={{ marginBottom: 6 }}>
                <IDANAGlyph size={28} color={selected.size > 0 ? 'var(--green)' : 'var(--muted-soft)'} />
              </div>
              <div style={{
                fontFamily: 'var(--serif)',
                fontSize: selected.size >= 2 ? 12 : 15,
                lineHeight: 1.1, color: 'var(--ink)', maxWidth: '90%',
                transition: 'font-size 0.2s ease',
              }}>
                {centerLabel || '—'}
              </div>
            </>
          )}
        </div>

        {/* Ring nodes */}
        {!hubLoading && layout.nodes.map(n => (
          <RingNodeBtn
            key={n.pairing.name}
            node={n}
            isSelected={selected.has(n.pairing.name)}
            onTap={() => toggleSelected(n.pairing.name)}
          />
        ))}

        {/* Show more */}
        {hidden > 0 && !hubLoading && (
          <button
            onClick={() => setDensity(d => d + 4)}
            style={{
              position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--card)', border: '1px solid var(--line-strong)',
              borderRadius: 999, padding: '8px 14px',
              fontSize: 12, color: 'var(--ink-soft)', boxShadow: 'var(--shadow-1)',
            }}
          >
            Show {hidden} more <Icon.Show size={14} />
          </button>
        )}

        {/* Empty state */}
        {activePairings.length === 0 && !fetching && !hubLoading && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 10, color: 'var(--muted)',
          }}>
            <IDANAGlyph size={36} color="var(--muted-soft)" />
            <p style={{ fontSize: 14, margin: 0 }}>No pairings to display.</p>
          </div>
        )}
      </div>

      {/* Floating Start Session button */}
      <div style={{
        position: 'fixed',
        bottom: 'calc(90px + env(safe-area-inset-bottom))',
        left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        padding: '0 16px',
        pointerEvents: 'none',
        zIndex: 40,
      }}>
        <button
          onClick={() => setShowModal(true)}
          style={{
            width: '100%', maxWidth: 320,
            height: 52,
            background: 'var(--green)', color: '#FBF8F2',
            border: 'none', borderRadius: 999,
            fontSize: 15, fontWeight: 600, fontFamily: 'inherit',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(59,83,35,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: selected.size > 0 ? 1 : 0,
            transform: selected.size > 0 ? 'translateY(0)' : 'translateY(12px)',
            transition: 'opacity 0.2s ease, transform 0.2s ease',
            pointerEvents: selected.size > 0 ? 'auto' : 'none',
          }}
        >
          <Icon.Plus size={16} stroke="#FBF8F2" />
          Start Session · {selected.size} ingredient{selected.size !== 1 ? 's' : ''}
        </button>
      </div>

      {showModal && selectedArr.length > 0 && (
        <NewSessionModal
          ingredientA={selectedArr[0]}
          allIngredients={selectedArr}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}

function RingNodeBtn({ node, isSelected, onTap }: {
  node: RingNode
  isSelected: boolean
  onTap: () => void
}) {
  const tone = TIERS[node.tier]
  const Glyph = iconFor(node.pairing.name)
  const words = node.pairing.name.split(' ')

  return (
    <button
      onClick={onTap}
      style={{
        position: 'absolute',
        left: node.x - node.r, top: node.y - node.r,
        width: node.r * 2, height: node.r * 2,
        borderRadius: '50%',
        background: tone.tintSoft,
        border: 'none',
        outline: isSelected ? '3px solid var(--green)' : '3px solid transparent',
        outlineOffset: '2px',
        boxShadow: isSelected
          ? '0 4px 20px rgba(59,83,35,0.25), var(--shadow-bubble)'
          : 'var(--shadow-bubble)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 6, textAlign: 'center', color: 'var(--ink)',
        transform: isSelected ? 'scale(1.08)' : 'scale(1)',
        transition: 'transform 180ms ease, outline-color 180ms ease, box-shadow 180ms ease',
        cursor: 'pointer',
        zIndex: isSelected ? 10 : 1,
      }}
    >
      <div style={{ color: tone.color, marginTop: -2, marginBottom: 2 }}>
        <Glyph size={18} sw={1.6} stroke={tone.color} />
      </div>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 12, lineHeight: 1.06, color: 'var(--ink)', maxWidth: '90%' }}>
        {words.length <= 1
          ? <div>{words[0]}</div>
          : words.length === 2
            ? <>{words.map(w => <div key={w}>{w}</div>)}</>
            : (() => {
                const mid = Math.ceil(words.length / 2)
                return <>
                  <div>{words.slice(0, mid).join(' ')}</div>
                  <div>{words.slice(mid).join(' ')}</div>
                </>
              })()
        }
      </div>
      <span style={{
        position: 'absolute', right: 2, bottom: 2,
        width: 16, height: 16, borderRadius: '50%',
        background: isSelected ? 'var(--green)' : tone.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 180ms ease',
      }}>
        <Icon.Plus size={8} stroke="#FBF8F2" sw={2.4} />
      </span>
    </button>
  )
}

function TierLegend() {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '0 4px', fontSize: 11, color: 'var(--muted)', alignItems: 'center', flexWrap: 'wrap' }}>
      {(Object.entries(TIERS) as [Tier, typeof TIERS[Tier]][]).map(([k, t]) => (
        <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: t.color }} />
          {t.label}
        </span>
      ))}
    </div>
  )
}
