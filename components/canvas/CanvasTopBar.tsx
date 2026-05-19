'use client'

import { useState, useRef, useEffect } from 'react'
import type React from 'react'

interface CanvasTopBarProps {
  title: string
  onTitleChange?: (title: string) => void
  onBack?: () => void
  onToggleMinimap?: () => void
  minimapVisible?: boolean
  nodeCount?: number
  saveIndicator?: React.ReactNode
}

export default function CanvasTopBar({
  title,
  onTitleChange,
  onBack,
  onToggleMinimap,
  minimapVisible,
  nodeCount = 0,
  saveIndicator,
}: CanvasTopBarProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDraft(title)
  }, [title])

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  const commitTitle = () => {
    setEditing(false)
    const trimmed = draft.trim()
    if (trimmed && trimmed !== title) {
      onTitleChange?.(trimmed)
    } else {
      setDraft(title)
    }
  }

  return (
    <div className="idana-topbar">
      <div className="idana-topbar-left">
        <button className="idana-topbar-back" onClick={onBack} title="Back to sessions">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <span className="idana-topbar-divider" />

        {editing ? (
          <input
            ref={inputRef}
            className="idana-topbar-title-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitTitle()
              if (e.key === 'Escape') { setDraft(title); setEditing(false) }
            }}
          />
        ) : (
          <button
            className="idana-topbar-title"
            onClick={() => setEditing(true)}
            title="Click to rename"
          >
            {title || 'Untitled Session'}
          </button>
        )}

        {nodeCount > 0 && (
          <span className="idana-topbar-count">{nodeCount}</span>
        )}
      </div>

      <div className="idana-topbar-right">
        {saveIndicator}

        <button
          className={`idana-topbar-btn ${minimapVisible ? 'idana-topbar-btn--active' : ''}`}
          onClick={onToggleMinimap}
          title="Toggle minimap"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3"/>
            <rect x="3" y="3" width="4" height="4" rx="1" fill="currentColor" opacity="0.4"/>
          </svg>
          <span>Map</span>
        </button>

        <button className="idana-topbar-btn" title="Tags">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1.5 1.5h4.7l6 6a1.2 1.2 0 010 1.7l-3 3a1.2 1.2 0 01-1.7 0l-6-6V1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
            <circle cx="4.5" cy="4.5" r="1" fill="currentColor"/>
          </svg>
          <span>Tags</span>
        </button>

        <button className="idana-topbar-btn idana-topbar-btn--share" title="Share session">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="11" cy="2.5" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
            <circle cx="3" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
            <circle cx="11" cy="11.5" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M4.4 6.3l5.2-3M4.4 7.7l5.2 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <span>Share</span>
        </button>
      </div>

      <style>{`
        .idana-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 52px;
          padding: 0 12px;
          background: var(--idana-cream, #F2EBD9);
          border-bottom: 1px solid var(--idana-ash, #C4B9A8);
          z-index: 10;
          flex-shrink: 0;
        }

        .idana-topbar-left {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .idana-topbar-right {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
        }

        .idana-topbar-back {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: none;
          background: transparent;
          border-radius: 8px;
          cursor: pointer;
          color: var(--idana-charcoal, #1C1A17);
          transition: background 0.15s;
          flex-shrink: 0;
        }

        .idana-topbar-back:hover {
          background: rgba(28, 26, 23, 0.06);
        }

        .idana-topbar-divider {
          width: 1px;
          height: 20px;
          background: var(--idana-ash, #C4B9A8);
          flex-shrink: 0;
        }

        .idana-topbar-title {
          font-family: var(--idana-font-display, 'Playfair Display', Georgia, serif);
          font-size: 15px;
          font-weight: 600;
          color: var(--idana-charcoal, #1C1A17);
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 4px 6px;
          border-radius: 6px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 280px;
          transition: background 0.15s;
        }

        .idana-topbar-title:hover {
          background: rgba(28, 26, 23, 0.05);
        }

        .idana-topbar-title-input {
          font-family: var(--idana-font-display, 'Playfair Display', Georgia, serif);
          font-size: 15px;
          font-weight: 600;
          color: var(--idana-charcoal, #1C1A17);
          background: var(--idana-cream, #F2EBD9);
          border: 1px solid var(--idana-clay, #8B5E3C);
          border-radius: 6px;
          padding: 3px 6px;
          outline: none;
          width: 240px;
        }

        .idana-topbar-count {
          font-size: 11px;
          font-family: var(--idana-font-body, 'DM Sans', system-ui, sans-serif);
          color: var(--idana-cream, #F2EBD9);
          background: var(--idana-clay, #8B5E3C);
          border-radius: 20px;
          padding: 1px 7px;
          font-weight: 500;
          flex-shrink: 0;
        }

        .idana-topbar-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 6px 10px;
          border: 1px solid var(--idana-ash, #C4B9A8);
          background: transparent;
          border-radius: 8px;
          cursor: pointer;
          color: var(--idana-charcoal, #1C1A17);
          font-size: 12px;
          font-family: var(--idana-font-body, 'DM Sans', system-ui, sans-serif);
          font-weight: 500;
          transition: background 0.15s, border-color 0.15s;
        }

        .idana-topbar-btn:hover {
          background: rgba(28, 26, 23, 0.05);
          border-color: var(--idana-clay, #8B5E3C);
        }

        .idana-topbar-btn--active {
          background: rgba(139, 94, 60, 0.1);
          border-color: var(--idana-clay, #8B5E3C);
          color: var(--idana-clay, #8B5E3C);
        }

        .idana-topbar-btn--share {
          background: var(--idana-charcoal, #1C1A17);
          border-color: var(--idana-charcoal, #1C1A17);
          color: var(--idana-cream, #F2EBD9);
        }

        .idana-topbar-btn--share:hover {
          background: var(--idana-umber, #3D2B1F);
          border-color: var(--idana-umber, #3D2B1F);
          color: var(--idana-cream, #F2EBD9);
        }

        @media (max-width: 600px) {
          .idana-topbar-btn span {
            display: none;
          }
          .idana-topbar-btn {
            padding: 6px 8px;
          }
        }
      `}</style>
    </div>
  )
}
