'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon, IDANAGlyph, IconProps } from '@/components/Icons'

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
  const key = ICON_POOL[hashStr(name) % ICON_POOL.length] as IconKey
  return Icon[key]
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

function layoutRadial(pairings: Pairing[], density: number, w: number, h: number) {
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

  const nodes: RingNode[] = ring.map((p, i) => {
    const angle = start + (i * 2 * Math.PI) / N
    return {
      pairing: p,
      tier: p.tier,
      x: cx + Math.cos(angle) * ringR,
      y: cy + Math.sin(angle) * ringR,
      r: p.tier === 'strong' ? 44 : p.tier === 'good' ? 40 : 38,
    }
  })

  return { center: { x: cx, y: cy, r: centerR }, nodes }
}

export default function PairingGraph({
  ingredientName,
  ingredient,
  pairings: pairingsProp,
  sessionId = null,
  onStartSession,
  onAddToSession,
  onNodeSelect,
}: PairingGraphProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 700, h: 520 })
  const [fetchedIngredient, setFetchedIngredient] = useState<string | null>(null)
  const [fetchedPairings, setFetchedPairings] = useState<Pairing[]>([])
  const [fetching, setFetching] = useState(false)
  const [selectedNode, setSelectedNode] = useState<RingNode | null>(null)
  const [density, setDensity] = useState(8)

  useEffect(() => {
    if (!ingredientName) return
    setFetching(true)
    setFetchedIngredient(null)
    setFetchedPairings([])
    fetch(`/api/ingredient/${encodeURIComponent(ingredientName)}`)
      .then(r => r.json())
      .then(data => {
        if (data.found) {
          setFetchedIngredient(data.ingredient)
          setFetchedPairings(data.pairings)
        }
      })
      .finally(() => setFetching(false))
  }, [ingredientName])

  useEffect(() => {
    if (!wrapRef.current) return
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect
      setSize({ w: Math.max(width, 300), h: Math.max(height, 300) })
    })
    ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [])

  const centerName = fetchedIngredient || ingredient || ingredientName || ''
  const activePairings = fetchedPairings.length > 0 ? fetchedPairings : (pairingsProp || [])

  const layout = useMemo(
    () => layoutRadial(activePairings, density, size.w, size.h),
    [activePairings, density, size.w, size.h]
  )

  const hidden = Math.max(0, activePairings.length - layout.nodes.length)

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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

        {/* Dashed edges */}
        <svg
          viewBox={`0 0 ${size.w} ${size.h}`}
          width={size.w} height={size.h}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        >
          {layout.nodes.map((n) => {
            const tone = TIERS[n.tier]
            const dx = n.x - layout.center.x
            const dy = n.y - layout.center.y
            const dist = Math.hypot(dx, dy)
            const ux = dx / dist, uy = dy / dist
            const x1 = layout.center.x + ux * layout.center.r
            const y1 = layout.center.y + uy * layout.center.r
            const x2 = n.x - ux * n.r
            const y2 = n.y - uy * n.r
            return (
              <g key={n.pairing.name}>
                <line x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={tone.color} strokeOpacity="0.5"
                  strokeWidth="1.2" strokeDasharray="3 4"
                />
                <circle cx={x1} cy={y1} r="2.5" fill={tone.color} />
              </g>
            )
          })}
        </svg>

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
        }}>
          <div style={{ marginBottom: 6 }}>
            <IDANAGlyph size={28} color="var(--green)" />
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 15, lineHeight: 1.05, color: 'var(--ink)', maxWidth: '90%' }}>
            {centerName || '—'}
          </div>
        </div>

        {/* Ring nodes */}
        {layout.nodes.map((n) => (
          <RingNodeBtn key={n.pairing.name} node={n} onTap={() => setSelectedNode(n)} />
        ))}

        {/* Show more */}
        {hidden > 0 && (
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
        {activePairings.length === 0 && !fetching && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 10, color: 'var(--muted)',
          }}>
            <IDANAGlyph size={36} color="var(--muted-soft)" />
            <p style={{ fontSize: 14, margin: 0 }}>No pairings to display.</p>
          </div>
        )}
      </div>

      {/* Detail sheet */}
      {selectedNode && (
        <DetailSheet
          node={selectedNode}
          centerName={centerName}
          sessionId={sessionId}
          onClose={() => setSelectedNode(null)}
          onAddToSession={onAddToSession}
          onStartSession={onStartSession}
          onNodeSelect={onNodeSelect}
        />
      )}
    </div>
  )
}

function RingNodeBtn({ node, onTap }: { node: RingNode; onTap: () => void }) {
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
        background: tone.tintSoft, border: `1px solid ${tone.tint}`,
        boxShadow: 'var(--shadow-bubble)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 6, textAlign: 'center', color: 'var(--ink)',
        transition: 'transform 160ms ease, box-shadow 160ms',
        cursor: 'pointer',
      }}
      onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.96)' }}
      onMouseUp={e => { e.currentTarget.style.transform = '' }}
      onMouseLeave={e => { e.currentTarget.style.transform = '' }}
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
        background: tone.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
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
          <span style={{ width: 8, height: 8, borderRadius: 999, background: t.color }}/>
          {t.label}
        </span>
      ))}
    </div>
  )
}

function DetailSheet({
  node, centerName, sessionId, onClose, onAddToSession, onStartSession, onNodeSelect,
}: {
  node: RingNode
  centerName: string
  sessionId: string | null
  onClose: () => void
  onAddToSession?: (names: string[]) => void
  onStartSession?: (ingredient: string, pairings: string[]) => void
  onNodeSelect?: (name: string) => void
}) {
  const tone = TIERS[node.tier]
  const Glyph = iconFor(node.pairing.name)

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)', zIndex: 100 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 101,
        background: 'var(--card)', borderRadius: '20px 20px 0 0',
        padding: '20px 24px', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
        maxWidth: 480, margin: '0 auto',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.14)',
        animation: 'slideUp 0.25s ease',
      }}>
        <style>{`@keyframes slideUp { from { transform: translateY(100%); opacity: 0 } to { transform: translateY(0); opacity: 1 } }`}</style>

        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--line-strong)', margin: '0 auto 20px' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: tone.tintSoft, border: `1px solid ${tone.tint}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Glyph size={20} sw={1.6} stroke={tone.color} />
          </div>
          <span style={{
            padding: '4px 10px', borderRadius: 999,
            background: tone.tintSoft, color: tone.color,
            border: `1px solid ${tone.tint}`,
            fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
          }}>
            {tone.label}
          </span>
        </div>

        <h2 style={{ fontFamily: 'var(--serif)', fontSize: 28, lineHeight: 1.05, color: 'var(--ink)', margin: '0 0 6px' }}>
          {node.pairing.name}
        </h2>
        <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 20px' }}>
          Flavor compatibility score: {Math.round(node.pairing.score * 100) / 100}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {onNodeSelect && (
            <button
              onClick={() => { onNodeSelect(node.pairing.name); onClose() }}
              style={{
                width: '100%', padding: '13px',
                background: 'transparent', border: '1px solid var(--line-strong)',
                borderRadius: 12, color: 'var(--ink-soft)',
                fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Find more with {node.pairing.name}
            </button>
          )}
          {sessionId && onAddToSession && (
            <button
              onClick={() => { onAddToSession([node.pairing.name]); onClose() }}
              className="cta"
              style={{ width: '100%', justifyContent: 'center', height: 48, fontSize: 14 }}
            >
              + Add to hub
            </button>
          )}
          {!sessionId && onStartSession && (
            <button
              onClick={() => { onStartSession(centerName, [node.pairing.name]); onClose() }}
              className="cta"
              style={{ width: '100%', justifyContent: 'center', height: 48, fontSize: 14 }}
            >
              Start session with this pair
            </button>
          )}
        </div>
      </div>
    </>
  )
}
