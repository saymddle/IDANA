'use client'

import { useState } from 'react'
import { Handle, Position, type NodeProps, NodeResizer } from '@xyflow/react'

interface Version {
  id: string
  label: string
  notes: string
  variables: string
  photo: string | null
}

interface ComparisonData {
  label: string
  versions: Version[]
  [key: string]: unknown
}

const VERSION_COLORS = ['#C0394B', '#3B4A8A', '#5A7A4A', '#C89B3C']

export default function ComparisonNode({ data, selected }: NodeProps) {
  const d = data as ComparisonData
  const [versions, setVersions] = useState<Version[]>(
    d.versions?.length
      ? d.versions
      : [
          { id: '1', label: 'V1', notes: '', variables: '', photo: null },
          { id: '2', label: 'V2', notes: '', variables: '', photo: null },
        ]
  )
  const [collapsed, setCollapsed] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  const syncVersions = (next: Version[]) => {
    d.versions = next
    setVersions(next)
  }

  const updateVersion = (id: string, field: keyof Version, val: string) => {
    syncVersions(versions.map(v => v.id === id ? { ...v, [field]: val } : v))
  }

  const addVersion = () => {
    if (versions.length >= 4) return
    syncVersions([...versions, {
      id: Date.now().toString(),
      label: `V${versions.length + 1}`,
      notes: '', variables: '', photo: null,
    }])
  }

  const removeVersion = (id: string) => {
    if (versions.length <= 2) return
    syncVersions(versions.filter(v => v.id !== id))
  }

  const colWidth = versions.length === 2 ? 'calc(50% - 4px)'
    : versions.length === 3 ? 'calc(33.33% - 5px)'
    : 'calc(25% - 6px)'

  return (
    <div className={`comp-node ${selected ? 'comp-node--selected' : ''}`}>
      {!collapsed && (
        <NodeResizer
          minWidth={220}
          minHeight={120}
          isVisible={selected}
          lineStyle={{ border: '1.5px dashed rgba(192, 57, 75, 0.4)' }}
          handleStyle={{ width: 10, height: 10, background: '#F2EBD9', border: '1.5px solid #C0394B', borderRadius: 3 }}
        />
      )}
      <Handle type="target" position={Position.Left} className="comp-handle" />
      <Handle type="source" position={Position.Right} className="comp-handle" />

      <div className="comp-header">
        <span className="comp-icon">⇄</span>
        <span className="comp-type-label">Comparison</span>
        <span className="comp-count">{versions.length} versions</span>
        <button className="comp-collapse-btn" onClick={() => setCollapsed(v => !v)}>
          {collapsed ? '▾' : '▴'}
        </button>
      </div>

      {!collapsed && (
        <>
          <div className="comp-grid">
            {versions.map((ver, i) => (
              <div
                key={ver.id}
                className={`comp-version ${activeId === ver.id ? 'comp-version--active' : ''}`}
                style={{
                  width: colWidth,
                  '--ver-color': VERSION_COLORS[i % VERSION_COLORS.length],
                } as React.CSSProperties}
                onClick={() => setActiveId(activeId === ver.id ? null : ver.id)}
              >
                <div className="comp-ver-header">
                  <input
                    className="comp-ver-label"
                    value={ver.label}
                    onChange={e => updateVersion(ver.id, 'label', e.target.value)}
                    onClick={e => e.stopPropagation()}
                    style={{ color: VERSION_COLORS[i % VERSION_COLORS.length] }}
                  />
                  {versions.length > 2 && (
                    <button
                      className="comp-ver-remove"
                      onClick={e => { e.stopPropagation(); removeVersion(ver.id) }}
                    >×</button>
                  )}
                </div>

                <input
                  className="comp-ver-variables"
                  value={ver.variables}
                  placeholder="e.g. 2% salt"
                  onChange={e => updateVersion(ver.id, 'variables', e.target.value)}
                  onClick={e => e.stopPropagation()}
                />

                <textarea
                  className="comp-ver-notes"
                  value={ver.notes}
                  placeholder="Tasting notes..."
                  rows={3}
                  onChange={e => updateVersion(ver.id, 'notes', e.target.value)}
                  onClick={e => e.stopPropagation()}
                />
              </div>
            ))}
          </div>

          {versions.length < 4 && (
            <div className="comp-footer">
              <button className="comp-add-btn" onClick={addVersion}>+ Add version</button>
            </div>
          )}
        </>
      )}

      {collapsed && (
        <div className="comp-collapsed-preview">
          {versions.map((ver, i) => (
            <span
              key={ver.id}
              className="comp-collapsed-chip"
              style={{
                background: `${VERSION_COLORS[i % VERSION_COLORS.length]}18`,
                color: VERSION_COLORS[i % VERSION_COLORS.length],
              }}
            >
              {ver.label}
            </span>
          ))}
        </div>
      )}

      <style>{`
        .comp-node {
          width: 100%;
          height: 100%;
          background: #FDFAF4;
          border: 1.5px solid #C4B9A8;
          border-radius: 14px;
          font-family: 'DM Sans', system-ui, sans-serif;
          overflow: hidden;
          transition: box-shadow 0.2s, border-color 0.2s;
        }
        .comp-node--selected {
          border-color: #C0394B;
          box-shadow: 0 0 0 3px rgba(192, 57, 75, 0.12);
        }
        .comp-handle {
          width: 8px !important; height: 8px !important;
          background: #C0394B !important;
          border: 2px solid #F2EBD9 !important;
          opacity: 0; transition: opacity 0.2s;
        }
        .comp-node:hover .comp-handle,
        .comp-node--selected .comp-handle { opacity: 1; }

        .comp-header {
          display: flex; align-items: center; gap: 7px;
          padding: 10px 12px 8px;
          border-bottom: 1px solid #EDE6D6;
        }
        .comp-icon { font-size: 13px; color: #C0394B; }
        .comp-type-label {
          font-size: 10px; font-weight: 600;
          letter-spacing: 0.06em; text-transform: uppercase;
          color: #C0394B; flex: 1;
        }
        .comp-count { font-size: 10px; color: #9A8F80; }
        .comp-collapse-btn {
          background: none; border: none; cursor: pointer;
          font-size: 12px; color: #9A8F80; padding: 0;
        }

        .comp-grid {
          display: flex; gap: 6px;
          padding: 10px 12px 6px;
          overflow-x: auto;
        }
        .comp-grid::-webkit-scrollbar { height: 3px; }
        .comp-grid::-webkit-scrollbar-thumb { background: #C4B9A8; border-radius: 2px; }

        .comp-version {
          flex-shrink: 0;
          border: 1px solid #EDE6D6;
          border-radius: 10px;
          padding: 8px;
          cursor: pointer;
          transition: border-color 0.15s, box-shadow 0.15s;
          display: flex; flex-direction: column; gap: 6px;
        }
        .comp-version:hover { border-color: var(--ver-color); }
        .comp-version--active {
          border-color: var(--ver-color);
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--ver-color) 15%, transparent);
        }

        .comp-ver-header { display: flex; align-items: center; justify-content: space-between; }
        .comp-ver-label {
          font-size: 12px; font-weight: 700;
          background: transparent; border: none; outline: none;
          font-family: 'JetBrains Mono', monospace;
          width: 100%; cursor: pointer;
        }
        .comp-ver-remove {
          background: none; border: none; cursor: pointer;
          font-size: 13px; color: #C4B9A8; padding: 0; line-height: 1;
          transition: color 0.15s; flex-shrink: 0;
        }
        .comp-ver-remove:hover { color: #C0394B; }

        .comp-ver-variables {
          font-size: 10px; font-weight: 600;
          font-family: 'JetBrains Mono', monospace;
          color: #6B5D50; background: #F5EFE3;
          border: none; border-radius: 5px; padding: 3px 5px;
          outline: none; width: 100%;
        }
        .comp-ver-variables::placeholder { color: #B0A090; font-weight: 400; }

        .comp-ver-notes {
          font-size: 11px; line-height: 1.45;
          font-family: 'Playfair Display', Georgia, serif;
          font-style: italic; color: #4A3D30;
          background: transparent; border: none;
          border-top: 1px solid #EDE6D6;
          outline: none; resize: none; padding-top: 5px; width: 100%;
        }
        .comp-ver-notes::placeholder { color: #B0A090; }

        .comp-footer { padding: 4px 12px 10px; text-align: center; }
        .comp-add-btn {
          font-size: 11px; color: #9A8F80;
          background: none; border: 1px dashed #C4B9A8;
          border-radius: 8px; padding: 4px 14px;
          cursor: pointer; font-family: 'DM Sans', system-ui, sans-serif;
          transition: all 0.15s;
        }
        .comp-add-btn:hover { border-color: #C0394B; color: #C0394B; }

        .comp-collapsed-preview { display: flex; align-items: center; gap: 5px; padding: 5px 12px 8px; }
        .comp-collapsed-chip {
          font-size: 10px; font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
          border-radius: 20px; padding: 2px 8px;
        }
      `}</style>
    </div>
  )
}
