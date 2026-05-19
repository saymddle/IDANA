'use client'

import { useState } from 'react'

interface ToolbarItem {
  type: string
  label: string
  icon: string
  color: string
}

const TOOLBAR_ITEMS: ToolbarItem[] = [
  { type: 'observation', label: 'Note',        icon: '✎',  color: '#8B5E3C' },
  { type: 'photo',       label: 'Photo',       icon: '🖣',  color: '#5A7A4A' },
  { type: 'ingredient',  label: 'Ingredient',  icon: '🌿',  color: '#D4622A' },
  { type: 'variable',    label: 'Variable',    icon: '⚙',  color: '#3B4A8A' },
  { type: 'pairing',     label: 'Pairing',     icon: '↭',  color: '#C0394B' },
  { type: 'texture',     label: 'Texture',     icon: '🧮',  color: '#C89B3C' },
  { type: 'voice',       label: 'Voice',       icon: '🎙',  color: '#8B5E3C' },
  { type: 'timeline',    label: 'Timeline',    icon: '⏱',  color: '#3B4A8A' },
  { type: 'comparison',  label: 'Compare',     icon: '⇄',  color: '#5A7A4A' },
]

interface CanvasToolbarProps {
  onSpawn: (type: string) => void
}

export default function CanvasToolbar({ onSpawn }: CanvasToolbarProps) {
  const [activeType, setActiveType] = useState<string | null>(null)

  const handleSpawn = (type: string) => {
    setActiveType(type)
    onSpawn(type)
    setTimeout(() => setActiveType(null), 400)
  }

  return (
    <div className="idana-toolbar-wrap">
      <div className="idana-toolbar">
        {TOOLBAR_ITEMS.map((item) => (
          <button
            key={item.type}
            className={`idana-tool-btn ${activeType === item.type ? 'idana-tool-btn--active' : ''}`}
            onClick={() => handleSpawn(item.type)}
            title={item.label}
            style={{ '--tool-color': item.color } as React.CSSProperties}
          >
            <span className="idana-tool-icon">{item.icon}</span>
            <span className="idana-tool-label">{item.label}</span>
          </button>
        ))}
      </div>

      <style>{`
        .idana-toolbar-wrap {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 10;
          display: flex;
          justify-content: center;
          padding: 10px 16px 14px;
          background: linear-gradient(to top, var(--idana-canvas-bg, #F5EFE3) 60%, transparent);
          pointer-events: none;
        }

        .idana-toolbar {
          display: flex;
          align-items: center;
          gap: 4px;
          background: var(--idana-cream, #F2EBD9);
          border: 1px solid var(--idana-ash, #C4B9A8);
          border-radius: 16px;
          padding: 6px 8px;
          pointer-events: all;
          box-shadow:
            0 4px 16px rgba(28, 26, 23, 0.08),
            0 1px 4px rgba(28, 26, 23, 0.06);
        }

        .idana-tool-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 8px 10px;
          border: none;
          background: transparent;
          border-radius: 10px;
          cursor: pointer;
          transition: background 0.15s, transform 0.12s;
          min-width: 52px;
        }

        .idana-tool-btn:hover {
          background: rgba(139, 94, 60, 0.08);
        }

        .idana-tool-btn--active {
          background: rgba(139, 94, 60, 0.14);
          transform: scale(0.94);
        }

        .idana-tool-icon {
          font-size: 18px;
          line-height: 1;
          color: var(--tool-color, var(--idana-clay, #8B5E3C));
          transition: transform 0.15s;
        }

        .idana-tool-btn:hover .idana-tool-icon {
          transform: translateY(-2px);
        }

        .idana-tool-label {
          font-size: 10px;
          font-family: var(--idana-font-body, 'DM Sans', system-ui, sans-serif);
          color: var(--idana-charcoal, #1C1A17);
          opacity: 0.6;
          letter-spacing: 0.02em;
          font-weight: 500;
          white-space: nowrap;
        }

        @media (max-width: 600px) {
          .idana-toolbar {
            gap: 0;
            padding: 4px 4px;
            border-radius: 14px;
          }

          .idana-tool-btn {
            min-width: 40px;
            padding: 7px 6px;
          }

          .idana-tool-label {
            display: none;
          }

          .idana-tool-icon {
            font-size: 20px;
          }
        }
      `}</style>
    </div>
  )
}
