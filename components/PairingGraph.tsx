'use client'

import {
  useCallback, useEffect,
  useMemo, useRef, useState,
} from 'react'
import {
  forceSimulation, forceManyBody, forceCollide,
  forceCenter, forceX, forceY, SimulationNodeDatum,
} from 'd3-force'
import { IDANAGlyph } from '@/components/Icons'
import { computeHubPairings } from '@/lib/hubUtils'
import NewSessionModal from '@/components/NewSessionModal'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Pairing {
  name: string
  score: number
  emphasis: boolean
  matchCount?: number
}

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

// ─── Simulation node ──────────────────────────────────────────────────────────

interface SimNode extends SimulationNodeDatum {
  id: string
  label: string
  radius: number
  color: string
  isSelected: boolean
  emphasis: boolean
  animIndex: number
}

interface RenderedNode {
  id: string; label: string
  x: number; y: number
  radius: number; color: string
  isSelected: boolean; emphasis: boolean
  animIndex: number
}

// ─── Palette ──────────────────────────────────────────────────────────────────

const C_SELECTED = '#C8A86B'

const PAIR_COLORS = [
  '#C97B5A', '#7FA89C', '#8EAFC4', '#B09080',
  '#8AAE8A', '#C4AFA8', '#A89070', '#9AABB8',
  '#B8A070', '#7A9E9A', '#C0886A', '#A0A8B8',
  '#B09878', '#8898A8', '#C8907A',
]

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}
function pairColor(name: string) {
  return PAIR_COLORS[hashStr(name) % PAIR_COLORS.length]
}

// ─── Radius ───────────────────────────────────────────────────────────────────

const R_SELECTED      = 52
const R_PAIR_MAX      = 38
const R_PAIR_MIN      = 16
const LABEL_INSIDE_D  = 44   // min diameter to show label inside bubble

function scoreToRadius(score: number, maxScore: number, isEmphasis: boolean): number {
  const norm = maxScore > 0 ? Math.sqrt(Math.min(score, maxScore) / maxScore) : 0.5
  const max  = isEmphasis ? R_PAIR_MAX : Math.round(R_PAIR_MAX * 0.78)
  return Math.round(R_PAIR_MIN + norm * (max - R_PAIR_MIN))
}

// ─── Breathe ──────────────────────────────────────────────────────────────────

const BREATHE_CSS = `
@keyframes idana-b1  { 0%,100%{transform:scale(1)} 50%{transform:scale(1.040)} }
@keyframes idana-b2  { 0%,100%{transform:scale(1)} 50%{transform:scale(1.050)} }
@keyframes idana-b3  { 0%,100%{transform:scale(1)} 50%{transform:scale(1.038)} }
@keyframes idana-b4  { 0%,100%{transform:scale(1)} 50%{transform:scale(1.045)} }
@keyframes idana-b5  { 0%,100%{transform:scale(1)} 50%{transform:scale(1.035)} }
@keyframes idana-b6  { 0%,100%{transform:scale(1)} 50%{transform:scale(1.052)} }
@keyframes idana-b7  { 0%,100%{transform:scale(1)} 50%{transform:scale(1.042)} }
@keyframes idana-b8  { 0%,100%{transform:scale(1)} 50%{transform:scale(1.030)} }
@keyframes idana-b9  { 0%,100%{transform:scale(1)} 50%{transform:scale(1.048)} }
@keyframes idana-b10 { 0%,100%{transform:scale(1)} 50%{transform:scale(1.041)} }
@keyframes idana-b11 { 0%,100%{transform:scale(1)} 50%{transform:scale(1.036)} }
@keyframes idana-b12 { 0%,100%{transform:scale(1)} 50%{transform:scale(1.053)} }
@keyframes idana-spin { to { transform: rotate(360deg) } }
`
const ANIM_NAMES  = ['idana-b1','idana-b2','idana-b3','idana-b4','idana-b5','idana-b6','idana-b7','idana-b8','idana-b9','idana-b10','idana-b11','idana-b12']
const ANIM_DURS   = ['4.2s','3.8s','5.1s','4.6s','3.5s','4.9s','4.0s','5.3s','3.7s','4.8s','3.9s','5.0s']
const ANIM_DELAYS = ['0s','0.7s','1.4s','0.3s','1.8s','0.9s','2.1s','0.5s','1.2s','1.6s','0.4s','2.3s']

function breatheStyle(index: number): React.CSSProperties {
  const i = index % ANIM_NAMES.length
  return { animation: `${ANIM_NAMES[i]} ${ANIM_DURS[i]} ease-in-out ${ANIM_DELAYS[i]} infinite` }
}

// ─── Zoom ─────────────────────────────────────────────────────────────────────

const ZOOM_MIN     = 0.4
const ZOOM_MAX     = 2.5
const ZOOM_DEFAULT = 1.0
const ZOOM_STEP    = 0.12

// ─── Bubble node ─────────────────────────────────────────────────────────────

function BubbleNode({
  node, zoom, cx, cy, pan, onTap, noTransition,
}: {
  node: RenderedNode
  zoom: number
  cx: number; cy: number
  pan: { x: number; y: number }
  onTap?: () => void
  noTransition?: boolean
}) {
  const x  = cx + (node.x - cx) * zoom + pan.x
  const y  = cy + (node.y - cy) * zoom + pan.y
  const r  = node.radius * zoom
  const d  = r * 2
  const inside = d >= LABEL_INSIDE_D
  const fontSize = Math.max(9, Math.min(14, Math.round(r * 0.34)))

  return (
    <div style={{
      position: 'absolute',
      left: x - r, top: y - r,
      zIndex: node.isSelected ? 3 : 1,
      // Smooth glide when layout recalculates (e.g. new ingredient added)
      transition: noTransition ? 'none' : 'left 0.35s cubic-bezier(0.34,1.56,0.64,1), top 0.35s cubic-bezier(0.34,1.56,0.64,1)',
    }}>
      <div
        onClick={onTap}
        style={{
          width: d, height: d,
          borderRadius: '50%',
          background: node.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: onTap ? 'pointer' : 'default',
          ...breatheStyle(node.animIndex),
        }}
      >
        {inside && (
          <span style={{
            fontFamily: 'var(--serif)',
            fontSize,
            lineHeight: 1.2,
            color: 'rgba(255,255,255,0.93)',
            textAlign: 'center',
            pointerEvents: 'none',
            letterSpacing: '0.01em',
            padding: '0 4px',
            maxWidth: d - 8,
            overflow: 'hidden',
            wordBreak: 'break-word',
          }}>
            {node.label}
          </span>
        )}
      </div>

      {!inside && (
        <div
          onClick={onTap}
          style={{
            position: 'absolute',
            top: d + 5,
            left: '50%',
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap',
            fontFamily: 'var(--serif)',
            fontSize: 10,
            color: 'rgba(255,255,255,0.92)',
            // Dark pill — readable on both light bg and dark bg
            background: 'rgba(28,24,20,0.62)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            borderRadius: 999,
            padding: '2px 7px',
            pointerEvents: onTap ? 'auto' : 'none',
            cursor: onTap ? 'pointer' : 'default',
            letterSpacing: '0.02em',
            lineHeight: 1.4,
          }}
        >
          {node.label}
        </div>
      )}
    </div>
  )
}

// ─── Zoom controls ────────────────────────────────────────────────────────────

function ZoomControls({ zoom, onZoom }: { zoom: number; onZoom: (d: number) => void }) {
  const btn: React.CSSProperties = {
    width: 32, height: 32, borderRadius: '50%',
    border: '1px solid rgba(255,255,255,0.14)',
    background: 'rgba(255,255,255,0.08)',
    backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
    color: 'var(--muted)', fontSize: 18,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', userSelect: 'none',
    transition: 'opacity 0.15s ease', fontFamily: 'inherit',
  }
  return (
    <div style={{ position: 'absolute', bottom: 48, right: 14, display: 'flex', flexDirection: 'column', gap: 6, zIndex: 20 }}>
      <button style={{ ...btn, opacity: zoom >= ZOOM_MAX ? 0.3 : 1 }} onClick={() => onZoom(ZOOM_STEP)}  disabled={zoom >= ZOOM_MAX} aria-label="Zoom in">+</button>
      <button style={{ ...btn, opacity: zoom <= ZOOM_MIN ? 0.3 : 1, fontSize: 22 }} onClick={() => onZoom(-ZOOM_STEP)} disabled={zoom <= ZOOM_MIN} aria-label="Zoom out">−</button>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PairingGraph({
  ingredientName,
  ingredient,
  pairings: pairingsProp,
  sessionId = null,
  onStartSession,
  onAddToSession,
}: PairingGraphProps) {
  const wrapRef = useRef<HTMLDivElement>(null)

  const [size, setSize]                           = useState({ w: 700, h: 520 })
  const [fetchedIngredient, setFetchedIngredient] = useState<string | null>(null)
  const [fetchedPairings, setFetchedPairings]     = useState<Pairing[]>([])
  const [fetching, setFetching]                   = useState(false)
  const [density, setDensity]                     = useState(16)

  // Zoom
  const zoomRef       = useRef(ZOOM_DEFAULT)
  const zoomTargetRef = useRef(ZOOM_DEFAULT)
  const zoomRafRef    = useRef<number | null>(null)
  const pinchRef      = useRef<{ dist: number } | null>(null)
  const isGesturing   = useRef(false)
  const [zoom, setZoom] = useState(ZOOM_DEFAULT)
  const [gestureActive, setGestureActive] = useState(false)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const panRef = useRef({ x: 0, y: 0 })
  const singleTouchRef = useRef<{ x: number; y: number } | null>(null)

  // Selection + hub
  const [selected, setSelected]       = useState<Set<string>>(new Set())
  const [hubPairings, setHubPairings] = useState<Pairing[] | null>(null)
  const [hubLoading, setHubLoading]   = useState(false)
  const [showModal, setShowModal]     = useState(false)

  // Sim — ref only, no async ticker
  const simRef    = useRef<ReturnType<typeof forceSimulation<SimNode>> | null>(null)
  const [renderedNodes, setRenderedNodes] = useState<RenderedNode[]>([])

  // ── Self-fetch — searched ingredient is auto-selected on load ───────────
  useEffect(() => {
    if (!ingredientName) return
    setFetching(true)
    setFetchedIngredient(null)
    setFetchedPairings([])
    setSelected(new Set())
    setHubPairings(null)
    panRef.current = { x: 0, y: 0 }
    setPan({ x: 0, y: 0 })
    fetch(`/api/ingredient/${encodeURIComponent(ingredientName)}`)
      .then(r => r.json())
      .then(data => {
        if (data.found) {
          setFetchedIngredient(data.ingredient)
          setFetchedPairings(data.pairings)
          // Pre-select the searched ingredient — it's the root of this session
          setSelected(new Set([data.ingredient]))
        }
      })
      .finally(() => setFetching(false))
  }, [ingredientName])

  // ── Auto-select ingredient when passed as prop (non-fetch mount path) ────
  useEffect(() => {
    if (!ingredient || fetchedIngredient) return
    setSelected(prev => {
      if (prev.has(ingredient)) return prev
      return new Set([ingredient])
    })
  }, [ingredient, fetchedIngredient])

  // ── ResizeObserver ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!wrapRef.current) return
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect
      setSize({ w: Math.max(width, 300), h: Math.max(height, 300) })
    })
    ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [])

  // ── Scroll-wheel zoom ─────────────────────────────────────────────────────
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      setZoomInstant(zoomRef.current + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP))
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  // ── Pinch-to-zoom ─────────────────────────────────────────────────────────
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const getDist = (t: TouchList) => {
      const dx = t[0].clientX - t[1].clientX
      const dy = t[0].clientY - t[1].clientY
      return Math.sqrt(dx * dx + dy * dy)
    }
    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        isGesturing.current = true
        setGestureActive(true)
        pinchRef.current = { dist: getDist(e.touches) }
        singleTouchRef.current = null
      } else if (e.touches.length === 1) {
        singleTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      }
    }
    const onMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault()
        const nd = getDist(e.touches)
        setZoomInstant(zoomRef.current * (nd / pinchRef.current.dist))
        pinchRef.current.dist = nd
      } else if (e.touches.length === 1 && singleTouchRef.current) {
        e.preventDefault()
        const dx = e.touches[0].clientX - singleTouchRef.current.x
        const dy = e.touches[0].clientY - singleTouchRef.current.y
        panRef.current = { x: panRef.current.x + dx, y: panRef.current.y + dy }
        setPan({ ...panRef.current })
        singleTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      }
    }
    const onEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        pinchRef.current = null
        isGesturing.current = false
        setGestureActive(false)
      }
      if (e.touches.length === 0) {
        singleTouchRef.current = null
      }
    }
    el.addEventListener('touchstart', onStart, { passive: true  })
    el.addEventListener('touchmove',  onMove,  { passive: false })
    el.addEventListener('touchend',   onEnd,   { passive: true  })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove',  onMove)
      el.removeEventListener('touchend',   onEnd)
    }
  }, [])

  function setZoomInstant(next: number) {
    const c = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next))
    zoomRef.current = c; zoomTargetRef.current = c
    if (zoomRafRef.current) { cancelAnimationFrame(zoomRafRef.current); zoomRafRef.current = null }
    setZoom(c)
  }

  function setZoomTarget(next: number) {
    zoomTargetRef.current = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next))
    if (zoomRafRef.current) return
    const tick = () => {
      const diff = zoomTargetRef.current - zoomRef.current
      if (Math.abs(diff) < 0.001) { zoomRef.current = zoomTargetRef.current; setZoom(zoomRef.current); zoomRafRef.current = null; return }
      zoomRef.current += diff * 0.18
      setZoom(zoomRef.current)
      zoomRafRef.current = requestAnimationFrame(tick)
    }
    zoomRafRef.current = requestAnimationFrame(tick)
  }

  useEffect(() => () => {
    if (zoomRafRef.current) cancelAnimationFrame(zoomRafRef.current)
    if (simRef.current) simRef.current.stop()
  }, [])

  // ── Data ──────────────────────────────────────────────────────────────────
  const basePairings    = fetchedPairings.length > 0 ? fetchedPairings : (pairingsProp ?? [])
  const centerName      = fetchedIngredient || ingredient || ingredientName || ''
  const activePairings  = hubPairings ?? basePairings
  const selectedArr     = Array.from(selected)
  const displaySelected = selectedArr
  const hidden          = Math.max(0, activePairings.length - density)

  const refreshHub = useCallback(async (sel: Set<string>) => {
    if (sel.size === 0) { setHubPairings(null); return }
    setHubLoading(true)
    try {
      const arr = Array.from(sel)
      let results: Pairing[]
      if (sel.size === 1) {
        const res = await fetch(`/api/ingredient/${encodeURIComponent(arr[0])}`)
        const d   = await res.json()
        results   = d.found ? d.pairings : []
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

  // Stable string keys — primitives as memo/effect deps so refs don't thrash
  const selectedKey = displaySelected.join('|')
  const pairingsKey = activePairings.slice(0, density).map(p => `${p.name}:${p.score.toFixed(3)}`).join(',')

  // ── Sim nodes — deduped by name to prevent duplicate React keys ───────────
  const simNodes = useMemo<SimNode[]>(() => {
    const nodes: SimNode[] = []
    const seen = new Set<string>()
    let animIdx = 0

    displaySelected.forEach(name => {
      const key = name.toLowerCase()
      if (seen.has(key)) return
      seen.add(key)
      nodes.push({ id: name, label: name, radius: R_SELECTED, color: C_SELECTED, isSelected: true, emphasis: true, animIndex: animIdx++ })
    })

    const visible  = activePairings.slice(0, density)
    const maxScore = visible.length > 0 ? Math.max(...visible.map(p => p.score)) : 1

    visible.forEach(p => {
      const key = p.name.toLowerCase()
      if (seen.has(key)) return
      seen.add(key)
      nodes.push({ id: p.name, label: p.name, radius: scoreToRadius(p.score, maxScore, p.emphasis), color: pairColor(p.name), isSelected: false, emphasis: p.emphasis, animIndex: animIdx++ })
    })

    return nodes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey, pairingsKey, density])

  // ── D3 force simulation — runs SYNCHRONOUSLY, no async ticker ────────────
  // Running synchronously means React sees only the final settled layout,
  // never intermediate jitter positions. The CSS transition on BubbleNode
  // handles the smooth spring animation between layouts.
  useEffect(() => {
    if (simNodes.length === 0) { setRenderedNodes([]); return }

    if (simRef.current) { simRef.current.stop(); simRef.current = null }

    const cx = size.w / 2
    const cy = size.h / 2

    // Seed deterministic starting positions (no Math.random — stable across renders)
    const selCount = simNodes.filter(n => n.isSelected).length
    const seeded: SimNode[] = simNodes.map((n, i) => {
      if (n.isSelected) {
        const a = -Math.PI / 2 + (i / Math.max(selCount, 1)) * Math.PI * 2
        const r = selCount <= 1 ? 0 : R_SELECTED * 1.2
        return { ...n, x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }
      }
      const pi = i - selCount
      const total = Math.max(simNodes.length - selCount, 1)
      const a = (pi / total) * Math.PI * 2
      const baseR = R_SELECTED * 1.6 + n.radius
      // Deterministic per-node jitter from name hash instead of Math.random
      const jitter = ((hashStr(n.id) % 41) - 20)
      return { ...n, x: cx + Math.cos(a) * (baseR + jitter), y: cy + Math.sin(a) * (baseR + jitter) }
    })

    const sim = forceSimulation<SimNode>(seeded)
      .force('center', forceCenter(cx, cy).strength(0.08))
      .force('x', forceX(cx).strength(0.12))
      .force('y', forceY(cy).strength(0.12))
      // Reduced charge — nodes repel less so cluster stays tight
      .force('charge', forceManyBody<SimNode>().strength(d => -(d.radius * d.radius * 0.45)))
      // Collision padding reduced to 2px — just enough to prevent overlap
      .force('collide', forceCollide<SimNode>(d => d.radius + 2).strength(1).iterations(4))
      .alphaDecay(0.028)
      .velocityDecay(0.45)
      .stop() // ← prevent async ticker entirely

    simRef.current = sim

    // Tick manually until alpha cools (~120–200 iterations for typical graphs)
    const iterations = Math.ceil(
      Math.log(sim.alphaMin() / sim.alpha()) / Math.log(1 - 0.028)
    )
    for (let i = 0; i < Math.min(iterations, 300); i++) sim.tick()

    // One state update → one React render → no jitter
    setRenderedNodes(sim.nodes().map(n => ({
      id: n.id, label: n.label,
      x: n.x ?? cx, y: n.y ?? cy,
      radius: n.radius, color: n.color,
      isSelected: n.isSelected, emphasis: n.emphasis,
      animIndex: n.animIndex,
    })))

    return () => { if (simRef.current) { simRef.current.stop(); simRef.current = null } }
  }, [simNodes, size.w, size.h])

  const canvasCx = size.w / 2
  const canvasCy = size.h / 2

  if (fetching) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, color: 'var(--muted)' }}>
        <style>{BREATHE_CSS}</style>
        <div style={{ width: 18, height: 18, border: '2px solid var(--line)', borderTopColor: 'var(--green)', borderRadius: '50%', animation: 'idana-spin 0.8s linear infinite' }} />
        Searching flavor graph…
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      <style>{BREATHE_CSS}</style>

      <div ref={wrapRef} style={{ flex: 1, position: 'relative', minHeight: 0 }}>

        {/* Background */}
        <div style={{ position: 'absolute', inset: 0, background: 'var(--bg-deep)', borderRadius: 20, overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'radial-gradient(rgba(28,28,26,0.04) 1px, transparent 1.4px)',
            backgroundSize: '14px 14px', backgroundPosition: '7px 7px',
            opacity: 0.5,
            maskImage: 'radial-gradient(circle at center, #000 40%, transparent 85%)',
            WebkitMaskImage: 'radial-gradient(circle at center, #000 40%, transparent 85%)',
          }} />
        </div>

        {/* Nodes */}
        {!hubLoading && renderedNodes.map(node => (
          <BubbleNode
            key={node.id}
            node={node}
            zoom={zoom}
            cx={canvasCx}
            cy={canvasCy}
            pan={pan}
            onTap={node.isSelected ? undefined : () => toggleSelected(node.id)}
            noTransition={gestureActive}
          />
        ))}

        {hubLoading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 18, height: 18, border: '2px solid var(--line)', borderTopColor: 'var(--green)', borderRadius: '50%', animation: 'idana-spin 0.8s linear infinite' }} />
          </div>
        )}

        {activePairings.length === 0 && !fetching && !hubLoading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, color: 'var(--muted)' }}>
            <IDANAGlyph size={36} color="var(--muted-soft)" />
            <p style={{ fontSize: 14, margin: 0 }}>No pairings to display.</p>
          </div>
        )}

        <ZoomControls zoom={zoom} onZoom={d => setZoomTarget(zoomRef.current + d)} />

        {hidden > 0 && !hubLoading && (
          <button
            onClick={() => setDensity(d => d + 6)}
            style={{ position: 'absolute', bottom: 52, left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 999, padding: '6px 14px', fontSize: 12, color: 'var(--muted)', cursor: 'pointer', zIndex: 20 }}
          >
            +{hidden} more pairings
          </button>
        )}

        {/* Bottom bar */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'none', zIndex: 20 }}>
          <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {selected.size > 0
              ? `${selected.size} ingredient${selected.size !== 1 ? 's' : ''} selected`
              : centerName ? '1 ingredient' : ''
            }
          </span>
          <button
            onClick={() => setShowModal(true)}
            style={{ fontFamily: 'inherit', fontSize: 12, fontWeight: 500, color: 'var(--green)', background: 'rgba(59,83,35,0.10)', border: 'none', borderRadius: 999, padding: '7px 14px', cursor: 'pointer', letterSpacing: '0.04em', pointerEvents: selected.size > 0 ? 'auto' : 'none', opacity: selected.size > 0 ? 1 : 0, transform: selected.size > 0 ? 'translateY(0)' : 'translateY(6px)', transition: 'opacity 0.2s ease, transform 0.2s ease' }}
          >
            Create session →
          </button>
        </div>
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