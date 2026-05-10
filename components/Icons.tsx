'use client'

import React, { useId } from 'react'

export interface IconProps {
  size?: number
  stroke?: string
  sw?: number
  fill?: string
}

function Ic({ d, size = 22, stroke = 'currentColor', sw = 1.6, fill = 'none', children }: IconProps & { d?: string; children?: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
         stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
         style={{ flexShrink: 0 }}>
      {d ? <path d={d}/> : children}
    </svg>
  )
}

export const Icon = {
  Search:       (p: IconProps) => <Ic {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></Ic>,
  ArrowRight:   (p: IconProps) => <Ic {...p} d="M5 12h14M13 5l7 7-7 7" />,
  ArrowLeft:    (p: IconProps) => <Ic {...p} d="M19 12H5M11 5l-7 7 7 7" />,
  Plus:         (p: IconProps) => <Ic {...p} d="M12 5v14M5 12h14" />,
  Close:        (p: IconProps) => <Ic {...p} d="M6 6l12 12M18 6L6 18" />,
  Sparkle:      (p: IconProps) => <Ic {...p}><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z"/><path d="M19 16l.7 1.8L21.5 18l-1.8.7L19 20l-.7-1.3L16.5 18l1.8-.2L19 16z"/></Ic>,
  Home:         (p: IconProps) => <Ic {...p}><path d="M4 11l8-7 8 7"/><path d="M6 10v9h12v-9"/></Ic>,
  Sessions:     (p: IconProps) => <Ic {...p}><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/></Ic>,
  Tags:         (p: IconProps) => <Ic {...p}><path d="M3 12V4h8l10 10-8 8L3 12z"/><circle cx="7.5" cy="7.5" r="1.4"/></Ic>,
  Profile:      (p: IconProps) => <Ic {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></Ic>,
  Filter:       (p: IconProps) => <Ic {...p} d="M4 6h16M7 12h10M10 18h4" />,
  Show:         (p: IconProps) => <Ic {...p} d="M6 9l6 6 6-6" />,
  ChevronRight: (p: IconProps) => <Ic {...p} d="M9 6l6 6-6 6" />,
  Drag:         (p: IconProps) => <Ic {...p}><circle cx="9" cy="6" r="0.8"/><circle cx="15" cy="6" r="0.8"/><circle cx="9" cy="12" r="0.8"/><circle cx="15" cy="12" r="0.8"/><circle cx="9" cy="18" r="0.8"/><circle cx="15" cy="18" r="0.8"/></Ic>,
  Leaf:         (p: IconProps) => <Ic {...p}><path d="M5 19c8 0 14-6 14-14-8 0-14 6-14 14z"/><path d="M5 19l8-8"/></Ic>,
  Drop:         (p: IconProps) => <Ic {...p}><path d="M12 3c4 5 6 8.5 6 11a6 6 0 0 1-12 0c0-2.5 2-6 6-11z"/></Ic>,
  Grid:         (p: IconProps) => <Ic {...p}><rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/></Ic>,
  Stripes:      (p: IconProps) => <Ic {...p}><circle cx="12" cy="12" r="9"/><path d="M5 9h14M5 13h14M5 17h14"/></Ic>,
  Flame:        (p: IconProps) => <Ic {...p}><path d="M12 3c1 3 5 5 5 9a5 5 0 1 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3 1-5 1-8z"/></Ic>,
  Wheat:        (p: IconProps) => <Ic {...p}><path d="M12 21V8"/><path d="M12 8c-3 0-5-2-5-5 3 0 5 2 5 5z"/><path d="M12 12c-3 0-5-2-5-5"/><path d="M12 12c3 0 5-2 5-5-3 0-5 2-5 5z"/><path d="M12 16c-3 0-5-2-5-5"/><path d="M12 16c3 0 5-2 5-5"/></Ic>,
  Sparkles:     (p: IconProps) => <Ic {...p}><path d="M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3"/></Ic>,
  Knife:        (p: IconProps) => <Ic {...p}><path d="M5 19l10-10"/><path d="M14 6l4 4-2 2-4-4z"/></Ic>,
}

export function IDANAGlyph({ size = 22, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
         strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 18c2-2 3-5 3-8M19 18c-2-2-3-5-3-8"/>
      <path d="M8 10c2-1 6-1 8 0"/>
      <circle cx="12" cy="9" r="1.1" fill={color}/>
    </svg>
  )
}

type GlyphKey = 'octopus' | 'leaf' | 'circle' | 'grain' | 'dot'

export interface FoodArtProps {
  palette?: [string, string, string, string]
  glyph?: GlyphKey
  label?: string
  style?: React.CSSProperties
}

export function FoodArt({
  palette = ['#A77B4E', '#3D2C1F', '#E8E1C9', '#1C1C1A'],
  glyph = 'circle',
  label = '',
  style = {},
}: FoodArtProps) {
  const id = useId()
  const [c1, c2, c3, c4] = palette

  const GlyphMap: Record<GlyphKey, React.ReactNode> = {
    octopus: (
      <g opacity="0.85" transform="translate(120,80)">
        <ellipse cx="0" cy="-12" rx="34" ry="28" fill={c4}/>
        <path d="M -28 0 C -36 30 -50 60 -40 75 L -22 70 C -22 50 -10 32 0 22" stroke={c4} strokeWidth="11" fill="none" strokeLinecap="round"/>
        <path d="M -10 14 C -20 38 -28 60 -18 78 L -2 72" stroke={c4} strokeWidth="11" fill="none" strokeLinecap="round"/>
        <path d="M 8 14 C 14 40 26 62 16 80 L 0 74" stroke={c4} strokeWidth="11" fill="none" strokeLinecap="round"/>
        <path d="M 28 0 C 38 30 52 60 40 75 L 22 70" stroke={c4} strokeWidth="11" fill="none" strokeLinecap="round"/>
        <circle cx="-8" cy="-16" r="3" fill={c3}/>
        <circle cx="8" cy="-16" r="3" fill={c3}/>
      </g>
    ),
    leaf: (
      <g opacity="0.9" transform="translate(120,90)">
        <path d="M -50 30 C -50 -30 0 -50 50 -30 C 50 30 0 50 -50 30 Z" fill={c4}/>
        <path d="M -50 30 L 50 -30" stroke={c3} strokeWidth="2" opacity="0.4"/>
        <path d="M -30 20 L 30 -20 M -10 30 L 10 -10" stroke={c3} strokeWidth="1.5" opacity="0.3"/>
      </g>
    ),
    circle: (
      <g opacity="0.85" transform="translate(120,80)">
        <circle cx="0" cy="0" r="48" fill={c4}/>
        <circle cx="0" cy="0" r="34" fill={c2} opacity="0.7"/>
        <circle cx="0" cy="0" r="20" fill={c3}/>
      </g>
    ),
    grain: (
      <g opacity="0.85" transform="translate(120,80)">
        <ellipse cx="0" cy="0" rx="44" ry="34" fill={c4}/>
        {[...Array(7)].map((_, i) => (
          <ellipse key={i}
            cx={Math.cos(i * 0.9 - 1) * 22} cy={Math.sin(i * 0.9 - 1) * 16}
            rx="6" ry="10" fill={c3} opacity="0.65"
            transform={`rotate(${i * 30} ${Math.cos(i * 0.9 - 1) * 22} ${Math.sin(i * 0.9 - 1) * 16})`}
          />
        ))}
      </g>
    ),
    dot: (
      <g opacity="0.95" transform="translate(120,80)">
        {[...Array(40)].map((_, i) => {
          const a = i * 0.62, r = 5 + i * 1.1
          return <circle key={i} cx={Math.cos(a) * r} cy={Math.sin(a) * r} r={1.2 + (i % 4) * 0.4} fill={c4}/>
        })}
      </g>
    ),
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: c3, ...style }}>
      <svg viewBox="0 0 240 160" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" style={{ display: 'block' }}>
        <defs>
          <radialGradient id={`g-${id}`} cx="30%" cy="20%" r="100%">
            <stop offset="0%" stopColor={c1}/>
            <stop offset="55%" stopColor={c2}/>
            <stop offset="100%" stopColor={c3}/>
          </radialGradient>
          <filter id={`grain-${id}`}>
            <feTurbulence baseFrequency="1.4" numOctaves="2" seed="3"/>
            <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.18 0"/>
            <feComposite in2="SourceGraphic" operator="in"/>
          </filter>
        </defs>
        <rect width="240" height="160" fill={`url(#g-${id})`}/>
        <rect width="240" height="160" filter={`url(#grain-${id})`}/>
        {GlyphMap[glyph] ?? GlyphMap.circle}
      </svg>
      {label && (
        <div style={{
          position: 'absolute', left: 10, bottom: 8,
          fontFamily: 'var(--serif)', color: c3,
          fontSize: 15, lineHeight: 1.05,
          textShadow: '0 1px 2px rgba(0,0,0,0.35)',
          maxWidth: 'calc(100% - 20px)',
        }}>
          {label}
        </div>
      )}
    </div>
  )
}
