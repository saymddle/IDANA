'use client'

import { useState } from 'react'
import type { SaveStatus, VersionMeta } from '@/hooks/useCanvasPersistence'

interface SaveStatusIndicatorProps {
  status: SaveStatus
  lastSaved: Date | null
  versions: VersionMeta[]
  onRestoreVersion: (versionId: string) => void
  onSaveNow: () => void
}

export default function SaveStatusIndicator({
  status, lastSaved, versions, onRestoreVersion, onSaveNow,
}: SaveStatusIndicatorProps) {
  const [showVersions, setShowVersions] = useState(false)

  const relativeTime = (date: Date) => {
    const diff = Date.now() - date.getTime()
    const secs = Math.floor(diff / 1000)
    if (secs < 5)  return 'just now'
    if (secs < 60) return `${secs}s ago`
    const mins = Math.floor(secs / 60)
    if (mins < 60) return `${mins}m ago`
    return `${Math.floor(mins / 60)}h ago`
  }

  const versionTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <div className="ssi-wrap">
      <button
        className={`ssi-pill ssi-pill--${status}`}
        onClick={() => status === 'idle' ? setShowVersions(v => !v) : onSaveNow()}
        title={status === 'idle' ? 'View version history' : 'Save now'}
      >
        {status === 'saving' && <span className="ssi-spinner" />}
        {status === 'saved'  && <span className="ssi-dot ssi-dot--saved" />}
        {status === 'error'  && <span className="ssi-dot ssi-dot--error" />}
        {status === 'idle'   && lastSaved && <span className="ssi-dot ssi-dot--idle" />}

        <span className="ssi-label">
          {status === 'saving' && 'Saving...'}
          {status === 'saved'  && 'Saved'}
          {status === 'error'  && 'Save failed'}
          {status === 'idle'   && lastSaved && `Saved ${relativeTime(lastSaved)}`}
          {status === 'idle'   && !lastSaved && 'Unsaved'}
        </span>

        {status === 'idle' && versions.length > 0 && (
          <span className="ssi-ver-count">{versions.length}</span>
        )}
      </button>

      {showVersions && versions.length > 0 && (
        <>
          <div className="ssi-backdrop" onClick={() => setShowVersions(false)} />
          <div className="ssi-dropdown">
            <div className="ssi-dropdown-header">
              <span className="ssi-dropdown-title">Version History</span>
              <span className="ssi-dropdown-sub">Last {versions.length} saves</span>
            </div>
            {versions.map((v, i) => (
              <button
                key={v.id}
                className="ssi-version-item"
                onClick={() => { onRestoreVersion(v.id); setShowVersions(false) }}
              >
                <div className="ssi-ver-info">
                  <span className="ssi-ver-time">{versionTime(v.created_at)}</span>
                  <span className="ssi-ver-label">{v.label || `Version ${versions.length - i}`}</span>
                </div>
                <span className="ssi-ver-nodes">{v.node_count} objects</span>
              </button>
            ))}
          </div>
        </>
      )}

      <style>{`
        .ssi-wrap { position: relative; }
        .ssi-pill {
          display: flex; align-items: center; gap: 5px;
          padding: 5px 10px; border-radius: 8px;
          border: 1px solid transparent;
          background: transparent; cursor: pointer;
          font-family: 'DM Sans', system-ui, sans-serif;
          transition: all 0.15s;
        }
        .ssi-pill--idle   { border-color: #C4B9A8; }
        .ssi-pill--saving { border-color: #C89B3C; background: rgba(200,155,60,0.06); }
        .ssi-pill--saved  { border-color: #5A7A4A; background: rgba(90,122,74,0.06); }
        .ssi-pill--error  { border-color: #C0394B; background: rgba(192,57,75,0.06); }
        .ssi-pill:hover   { background: rgba(28,26,23,0.04); }

        .ssi-spinner {
          width: 10px; height: 10px; border-radius: 50%;
          border: 1.5px solid #C4B9A8; border-top-color: #C89B3C;
          animation: ssi-spin 0.7s linear infinite; flex-shrink: 0;
        }
        @keyframes ssi-spin { to { transform: rotate(360deg) } }

        .ssi-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .ssi-dot--saved { background: #5A7A4A; }
        .ssi-dot--error { background: #C0394B; }
        .ssi-dot--idle  { background: #C4B9A8; }

        .ssi-label { font-size: 11px; font-weight: 500; color: #6B5D50; white-space: nowrap; }
        .ssi-pill--saved .ssi-label  { color: #5A7A4A; }
        .ssi-pill--error .ssi-label  { color: #C0394B; }
        .ssi-pill--saving .ssi-label { color: #C89B3C; }

        .ssi-ver-count {
          font-size: 9px; font-weight: 700;
          background: #C4B9A8; color: #1C1A17;
          border-radius: 20px; padding: 1px 5px;
        }

        .ssi-backdrop { position: fixed; inset: 0; z-index: 40; }
        .ssi-dropdown {
          position: absolute; top: calc(100% + 6px); right: 0;
          background: #FDFAF4; border: 1.5px solid #C4B9A8;
          border-radius: 12px; padding: 6px;
          box-shadow: 0 8px 24px rgba(60,40,20,0.12);
          z-index: 50; min-width: 220px;
        }
        .ssi-dropdown-header {
          display: flex; align-items: baseline; justify-content: space-between;
          padding: 6px 8px 8px; border-bottom: 1px solid #EDE6D6; margin-bottom: 4px;
        }
        .ssi-dropdown-title {
          font-size: 11px; font-weight: 700;
          letter-spacing: 0.05em; text-transform: uppercase; color: #1C1A17;
        }
        .ssi-dropdown-sub { font-size: 10px; color: #9A8F80; }

        .ssi-version-item {
          display: flex; align-items: center; justify-content: space-between;
          width: 100%; padding: 8px 10px; border-radius: 8px;
          border: none; background: transparent; cursor: pointer;
          font-family: 'DM Sans', system-ui, sans-serif;
          transition: background 0.12s; text-align: left;
        }
        .ssi-version-item:hover { background: #F0E8D8; }

        .ssi-ver-info { display: flex; flex-direction: column; gap: 1px; }
        .ssi-ver-time {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px; color: #1C1A17; font-variant-numeric: tabular-nums;
        }
        .ssi-ver-label { font-size: 10px; color: #9A8F80; }
        .ssi-ver-nodes {
          font-size: 10px; color: #9A8F80;
          background: #F5EFE3; border-radius: 20px; padding: 2px 7px; flex-shrink: 0;
        }
      `}</style>
    </div>
  )
}
