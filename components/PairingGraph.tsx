'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { computeHubPairings } from '@/lib/hubUtils'

interface Pairing { name: string; score: number; emphasis: boolean; matchCount?: number }

interface PairingGraphProps {
  ingredient: string
  pairings: Pairing[]
  sessionId?: string | null
  onSelectionsChange?: (selected: Pairing[]) => void
  onStartSession?: (ingredient: string, pairings: string[]) => void
  onAddToSession?: (pairings: string[]) => void
}

const PAGE_SIZE = 15

const TIER_COLOR: Record<string, string> = {
  strong: '#2F5D3A',
  good:   '#C8923A',
  twist:  '#6B5B8A',
}
const TIER_LABEL: Record<string, string> = {
  strong: 'Strong',
  good:   'Good',
  twist:  'Interesting',
}

function getTier(p: Pairing): 'strong' | 'good' | 'twist' {
  if (p.score >= 1.3 || p.emphasis) return 'strong'
  if (p.score >= 1.2)               return 'good'
  return 'twist'
}

function bubbleR(score: number, emphasis: boolean): number {
  if (emphasis || score >= 1.5) return 54
  if (score >= 1.3)             return 46
  if (score >= 1.2)             return 38
  return 30
}

interface C {
  x: number; y: number; r: number; id: string
  pairing?: Pairing; tier?: string; isCenter?: boolean; label?: string
}

function pack(centerR: number, items: { id: string; r: number; pairing: Pairing; tier: string }[]): C[] {
  const circles: C[] = [{ x: 0, y: 0, r: centerR, id: 'center', isCenter: true }]
  for (const item of items) {
    const r = item.r
    let bestX = 0, bestY = 0, bestDist = Infinity
    for (let i = 0; i < circles.length; i++) {
      for (let j = i; j < circles.length; j++) {
        const a = circles[i], b = circles[j]
        const cands: { x: number; y: number }[] = []
        if (i === j) {
          const d = a.r + r + 2
          for (let t = 0; t < 24; t++) {
            const ang = (2 * Math.PI * t) / 24
            cands.push({ x: a.x + d * Math.cos(ang), y: a.y + d * Math.sin(ang) })
          }
        } else {
          const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy)
          const ra = a.r + r + 2, rb = b.r + r + 2
          if (d > ra + rb || d < Math.abs(ra - rb)) continue
          const cosA = (d * d + ra * ra - rb * rb) / (2 * d * ra)
          if (Math.abs(cosA) > 1) continue
          const a0 = Math.atan2(dy, dx), da = Math.acos(Math.min(1, Math.max(-1, cosA)))
          cands.push(
            { x: a.x + ra * Math.cos(a0 + da), y: a.y + ra * Math.sin(a0 + da) },
            { x: a.x + ra * Math.cos(a0 - da), y: a.y + ra * Math.sin(a0 - da) },
          )
        }
        for (const cand of cands) {
          const ov = circles.some(c => Math.hypot(cand.x - c.x, cand.y - c.y) < c.r + r + 0.5)
          if (!ov) {
            const dist = Math.hypot(cand.x, cand.y)
            if (dist < bestDist) { bestDist = dist; bestX = cand.x; bestY = cand.y }
          }
        }
      }
    }
    circles.push({ x: bestX, y: bestY, r, id: item.id, pairing: item.pairing, tier: item.tier })
  }
  return circles
}

function CenterBubble({ c }: { c: C }) {
  return (
    <div style={{
      position: 'absolute', left: c.x - c.r, top: c.y - c.r,
      width: c.r * 2, height: c.r * 2, borderRadius: '50%',
      background: 'var(--ink)', border: '3px solid var(--line-2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 10, boxShadow: '0 0 0 4px var(--bg)',
    }}>
      <span style={{
        color: 'var(--bg)', fontSize: Math.max(9, Math.min(13, c.r / 5)),
        fontWeight: 700, textAlign: 'center', padding: '0 8px', lineHeight: 1.2,
        fontFamily: 'Fraunces, Georgia, serif', wordBreak: 'break-word', maxWidth: c.r * 1.6,
      }}>
        {c.label}
      </span>
    </div>
  )
}

function PairingBubble({ c, selected, hovered, pinned, onEnter, onLeave, onClick }: {
  c: C; selected: boolean; hovered: boolean; pinned: boolean
  onEnter: () => void; onLeave: () => void; onClick: () => void
}) {
  const color = TIER_COLOR[c.tier!]
  const bg = selected || pinned ? color : hovered ? `${color}80` : `${color}4D`
  const scale = (selected || pinned) ? 1.07 : hovered ? 1.13 : 1
  return (
    <div onClick={onClick} onMouseEnter={onEnter} onMouseLeave={onLeave} style={{
      position: 'absolute', left: c.x - c.r, top: c.y - c.r,
      width: c.r * 2, height: c.r * 2, borderRadius: '50%',
      background: bg, border: `2px solid ${color}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', transform: `scale(${scale})`, transformOrigin: 'center',
      transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1), background 0.15s, box-shadow 0.15s',
      zIndex: selected || pinned ? 20 : hovered ? 15 : 1,
      boxShadow: selected || pinned
        ? `0 0 0 3px var(--bg), 0 0 0 5px ${color}, 0 8px 24px ${color}60`
        : hovered ? `0 6px 20px ${color}50` : `0 2px 6px ${color}25`,
      userSelect: 'none',
    }}>
      <span style={{
        fontSize: Math.max(8, Math.min(11, c.r / 3.8)), fontWeight: 700,
        color: 'rgba(255,255,255,0.95)',
        textAlign: 'center', padding: '0 5px', lineHeight: 1.2,
        fontFamily: 'Inter, sans-serif', wordBreak: 'break-word',
        pointerEvents: 'none', maxWidth: c.r * 1.7,
      }}>
        {c.pairing!.name}
      </span>
    </div>
  )
}

export default function PairingGraph({
  ingredient, pairings, sessionId = null,
  onSelectionsChange, onStartSession, onAddToSession,
}: PairingGraphProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ w: 700, h: 520 })
  const [page, setPage] = useState(1)
  const [hovered, setHovered] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 })

  const [hubPairings, setHubPairings] = useState<Pairing[] | null>(null)
  const [hubLoading, setHubLoading] = useState(false)

  useEffect(() => {
    const el = wrapRef.current; if (!el) return
    const obs = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect
      setDims({ w: Math.max(width, 300), h: Math.max(height, 300) })
    })
    obs.observe(el); return () => obs.disconnect()
  }, [])

  useEffect(() => {
    setPage(1); setSelected(new Set()); setHubPairings(null)
    setScale(1); setOffset({ x: 0, y: 0 })
  }, [ingredient])

  useEffect(() => {
    const el = wrapRef.current; if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      setScale(prev => Math.min(3, Math.max(0.3, prev - e.deltaY * 0.001)))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-bubble]')) return
    isPanning.current = true
    panStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
  }

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isPanning.current) return
      setOffset({
        x: panStart.current.ox + e.clientX - panStart.current.x,
        y: panStart.current.oy + e.clientY - panStart.current.y,
      })
    }
    const onUp = () => { isPanning.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  const baseSorted = useMemo(() => {
    const seen = new Map<string, Pairing>()
    pairings.forEach(p => { const ex = seen.get(p.name); if (!ex || p.score > ex.score) seen.set(p.name, p) })
    return Array.from(seen.values()).sort((a, b) => b.score - a.score)
  }, [pairings])

  const refreshHub = useCallback(async (sel: Set<string>) => {
    if (sel.size < 2) { setHubPairings(null); return }
    setHubLoading(true)
    const hubMembers = [ingredient, ...Array.from(sel)]
    const computed = await computeHubPairings(hubMembers, true)
    const memberSet = new Set(hubMembers.map(n => n.toLowerCase()))
    setHubPairings(computed.filter(p => !memberSet.has(p.name.toLowerCase())))
    setHubLoading(false)
  }, [ingredient])

  const toggle = useCallback((name: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      setTimeout(() => refreshHub(next), 0)
      return next
    })
  }, [refreshHub])

  useEffect(() => {
    onSelectionsChange?.(baseSorted.filter(p => selected.has(p.name)))
  }, [selected])

  const isHubMode = selected.size >= 2 && hubPairings !== null
  const activePairings = useMemo(() => {
    if (!isHubMode) return baseSorted
    const hubNames = new Set(hubPairings!.map(p => p.name.toLowerCase()))
    const pinnedNotInHub = baseSorted.filter(p => selected.has(p.name) && !hubNames.has(p.name.toLowerCase()))
    return [...hubPairings!, ...pinnedNotInHub]
  }, [isHubMode, hubPairings, baseSorted, selected])

  const visible = useMemo(() => activePairings.slice(0, page * PAGE_SIZE), [activePairings, page])
  const hasMore = visible.length < activePairings.length

  const circles = useMemo(() => {
    const centerR = Math.min(dims.w, dims.h) * 0.1
    const items = [...visible]
      .sort((a, b) => bubbleR(b.score, b.emphasis) - bubbleR(a.score, a.emphasis))
      .map(p => ({ id: `${getTier(p)}-${p.name}`, r: bubbleR(p.score, p.emphasis), pairing: p, tier: getTier(p) }))
    const packed = pack(centerR, items)
    const minX = Math.min(...packed.map(c => c.x - c.r))
    const maxX = Math.max(...packed.map(c => c.x + c.r))
    const minY = Math.min(...packed.map(c => c.y - c.r))
    const maxY = Math.max(...packed.map(c => c.y + c.r))
    const ox = dims.w / 2 - (minX + maxX) / 2
    const oy = dims.h / 2 - (minY + maxY) / 2
    return packed.map(c => ({ ...c, x: c.x + ox, y: c.y + oy, label: c.isCenter ? ingredient : undefined }))
  }, [visible, dims, ingredient])

  const selectedList = baseSorted.filter(p => selected.has(p.name))

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        ref={wrapRef}
        onMouseDown={onMouseDown}
        style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'var(--bg)', cursor: 'default' }}
      >
        <div style={{ position: 'absolute', bottom: 14, right: 14, fontSize: 11, color: 'var(--ink-4)', zIndex: 30, pointerEvents: 'none' }}>
          scroll to zoom · drag to pan
        </div>

        <div
          ref={canvasRef}
          style={{
            position: 'absolute', inset: 0,
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: 'center',
            transition: isPanning.current ? 'none' : 'transform 0.05s',
          }}
        >
          {hubLoading && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 10, color: 'var(--ink-3)', zIndex: 30,
              background: 'var(--bg)',
            }}>
              <div style={{ width: 16, height: 16, border: '2px solid var(--line)', borderTopColor: 'var(--green)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
              Computing hub pairings...
            </div>
          )}

          {!hubLoading && circles.map(c =>
            c.isCenter
              ? <CenterBubble key={c.id} c={c} />
              : (
                <div key={c.id} data-bubble="true">
                  <PairingBubble
                    c={c}
                    selected={selected.has(c.pairing!.name)}
                    pinned={isHubMode && selected.has(c.pairing!.name)}
                    hovered={hovered === c.id}
                    onEnter={() => setHovered(c.id)}
                    onLeave={() => setHovered(null)}
                    onClick={() => toggle(c.pairing!.name)}
                  />
                </div>
              )
          )}
        </div>

        {/* Legend */}
        <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', flexDirection: 'column', gap: 5, pointerEvents: 'none', zIndex: 20 }}>
          {Object.entries(TIER_COLOR).map(([tier, color]) => (
            <div key={tier} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
              <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--ink-3)' }}>{TIER_LABEL[tier]}</span>
            </div>
          ))}
        </div>

        {/* Zoom controls */}
        <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', gap: 6, zIndex: 20 }}>
          <button onClick={() => setScale(s => Math.min(3, s + 0.2))} style={zoomBtnStyle}>+</button>
          <button onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }) }} style={zoomBtnStyle}>⟳</button>
          <button onClick={() => setScale(s => Math.max(0.3, s - 0.2))} style={zoomBtnStyle}>−</button>
        </div>

        {selected.size > 0 && (
          <div style={{
            position: 'absolute', bottom: 14, left: 14, zIndex: 20,
            background: 'var(--green)', color: '#FBF7F0',
            borderRadius: 999, padding: '5px 12px',
            fontSize: 12, fontWeight: 600,
            boxShadow: '0 4px 12px rgba(47,93,58,0.3)',
          }}>
            {selected.size} selected · tap to deselect
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, padding: '12px 20px',
        borderTop: '1px solid var(--line)', background: 'var(--bg)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {hasMore && (
            <button onClick={() => setPage(p => p + 1)} style={{
              padding: '8px 18px', background: 'var(--surface)',
              border: '1px solid var(--line-2)', borderRadius: 999,
              color: 'var(--ink-2)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              ↓ Load 15 more
              <span style={{ color: 'var(--ink-4)', fontSize: 11 }}>({activePairings.length - visible.length} left)</span>
            </button>
          )}
          <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>
            {visible.length} / {activePairings.length}
          </span>
        </div>

        {selectedList.length > 0 && (
          <button
            onClick={() => {
              const names = selectedList.map(p => p.name)
              sessionId ? onAddToSession?.(names) : onStartSession?.(ingredient, names)
            }}
            style={{
              padding: '11px 24px', background: 'var(--green)', color: '#FBF7F0',
              border: 'none', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 8px 22px rgba(47,93,58,0.3)',
            }}
          >
            {sessionId
              ? <><span style={{ fontSize: 15 }}>+</span>Add {selectedList.length} to Session</>
              : `Start Session with ${selectedList.length} ingredient${selectedList.length > 1 ? 's' : ''}`
            }
          </button>
        )}
      </div>
    </div>
  )
}

const zoomBtnStyle: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 8,
  border: '1px solid var(--line)', background: 'var(--surface)',
  color: 'var(--ink-2)', cursor: 'pointer', fontSize: 14,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: 'inherit',
}
