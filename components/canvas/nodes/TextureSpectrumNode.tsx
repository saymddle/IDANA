'use client'

import { useState, useRef, useCallback } from 'react'
import { Handle, Position, type NodeProps, NodeResizer } from '@xyflow/react'

const DEFAULT_SPECTRUMS = [
  { id: '1', left: 'silky',   right: 'grainy',  value: 50 },
  { id: '2', left: 'airy',    right: 'dense',   value: 30 },
  { id: '3', left: 'elastic', right: 'brittle', value: 70 },
]

interface Spectrum {
  id: string
  left: string
  right: string
  value: number
}

interface TextureData {
  label: string
  spectrums: Spectrum[]
  [key: string]: unknown
}

// ── Custom draggable track — uses pointer capture so drag works outside the node
function SpectrumTrack({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  const trackRef  = useRef<HTMLDivElement>(null)
  const dragging  = useRef(false)

  const calcValue = useCallback((clientX: number) => {
    const track = trackRef.current
    if (!track) return
    const rect = track.getBoundingClientRect()
    const raw  = (clientX - rect.left) / rect.width
    const clamped = Math.min(1, Math.max(0, raw))
    onChange(Math.round(clamped * 100))
  }, [onChange])

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    dragging.current = true
    ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
    calcValue(e.clientX)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    e.preventDefault()
    calcValue(e.clientX)
  }

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = false
    ;(e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId)
  }

  return (
    <div
      ref={trackRef}
      className="tex-track"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{ touchAction: 'none' }}
    >
      <div className="tex-fill" style={{ width: `${value}%` }} />
      <div className="tex-dot"  style={{ left: `${value}%` }} />
    </div>
  )
}

export default function TextureSpectrumNode({ data, selected }: NodeProps) {
  const d = data as TextureData
  const [spectrums, setSpectrums] = useState<Spectrum[]>(
    d.spectrums?.length ? d.spectrums : DEFAULT_SPECTRUMS
  )
  const [collapsed,  setCollapsed]  = useState(false)
  const [editingId,  setEditingId]  = useState<string | null>(null)

  const updateValue = (id: string, value: number) => {
    setSpectrums(prev => {
      const next = prev.map(s => s.id === id ? { ...s, value } : s)
      d.spectrums = next
      return next
    })
  }

  const updateLabel = (id: string, side: 'left' | 'right', val: string) => {
    setSpectrums(prev => {
      const next = prev.map(s => s.id === id ? { ...s, [side]: val } : s)
      d.spectrums = next
      return next
    })
  }

  const addSpectrum = () => {
    const newS: Spectrum = {
      id:    Date.now().toString(),
      left:  'smooth',
      right: 'rough',
      value: 50,
    }
    setSpectrums(prev => {
      const next = [...prev, newS]
      d.spectrums = next
      return next
    })
    setEditingId(newS.id)
  }

  const removeSpectrum = (id: string) => {
    setSpectrums(prev => {
      const next = prev.filter(s => s.id !== id)
      d.spectrums = next
      return next
    })
  }

  return (
    <div className={`tex-node ${selected ? 'tex-node--selected' : ''}`}>
      {!collapsed && (
        <NodeResizer
          minWidth={200}
          minHeight={100}
          isVisible={selected}
          lineStyle={{ border: '1.5px dashed rgba(200, 155, 60, 0.4)' }}
          handleStyle={{ width: 10, height: 10, background: '#F2EBD9', border: '1.5px solid #C89B3C', borderRadius: 3 }}
        />
      )}
      <Handle type="target" position={Position.Left} className="tex-handle" />
      <Handle type="source" position={Position.Right} className="tex-handle" />

      <div className="tex-header">
        <span className="tex-icon">≋</span>
        <span className="tex-type-label">Texture Spectrum</span>
        <button className="tex-collapse-btn" onClick={() => setCollapsed(v => !v)}>
          {collapsed ? '▾' : '▴'}
        </button>
      </div>

      {!collapsed && (
        <div className="tex-body">
          {spectrums.map(s => (
            <div key={s.id} className="tex-spectrum">
              {editingId === s.id ? (
                <div className="tex-label-edit-row">
                  <input
                    className="tex-label-input"
                    value={s.left}
                    autoFocus
                    onChange={e => updateLabel(s.id, 'left', e.target.value)}
                    onBlur={() => setEditingId(null)}
                    onPointerDown={e => e.stopPropagation()}
                  />
                  <span className="tex-label-sep">↔</span>
                  <input
                    className="tex-label-input"
                    value={s.right}
                    onChange={e => updateLabel(s.id, 'right', e.target.value)}
                    onPointerDown={e => e.stopPropagation()}
                  />
                  <button
                    className="tex-remove-btn"
                    onPointerDown={e => e.stopPropagation()}
                    onClick={() => removeSpectrum(s.id)}
                  >×</button>
                </div>
              ) : (
                <div
                  className="tex-label-row"
                  onDoubleClick={() => setEditingId(s.id)}
                >
                  <span className="tex-label tex-label--left">{s.left}</span>
                  <span className="tex-label tex-label--right">{s.right}</span>
                </div>
              )}

              {/* Custom pointer-capture track — no native range input */}
              <div className="tex-track-wrap">
                <SpectrumTrack
                  value={s.value}
                  onChange={v => updateValue(s.id, v)}
                />
              </div>
            </div>
          ))}

          <button
            className="tex-add-btn"
            onPointerDown={e => e.stopPropagation()}
            onClick={addSpectrum}
          >
            + Add spectrum
          </button>
        </div>
      )}

      {collapsed && (
        <div className="tex-collapsed-preview">
          {spectrums.slice(0, 2).map(s => (
            <div key={s.id} className="tex-collapsed-item">
              <span>{s.left}</span>
              <div className="tex-collapsed-bar">
                <div className="tex-collapsed-fill" style={{ width: `${s.value}%` }} />
              </div>
              <span>{s.right}</span>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .tex-node {
          width: 100%; height: 100%; background: #FDFAF4;
          border: 1.5px solid #C4B9A8; border-radius: 14px;
          font-family: 'DM Sans', system-ui, sans-serif;
          overflow: visible;
          transition: box-shadow 0.2s, border-color 0.2s;
        }
        .tex-node--selected {
          border-color: #C89B3C;
          box-shadow: 0 0 0 3px rgba(200,155,60,0.15);
        }
        .tex-handle {
          width: 8px !important; height: 8px !important;
          background: #C89B3C !important; border: 2px solid #F2EBD9 !important;
          opacity: 0; transition: opacity 0.2s;
        }
        .tex-node:hover .tex-handle,
        .tex-node--selected .tex-handle { opacity: 1; }

        .tex-header {
          display: flex; align-items: center; gap: 7px;
          padding: 10px 12px 8px; border-bottom: 1px solid #EDE6D6;
          border-radius: 14px 14px 0 0; overflow: hidden;
        }
        .tex-icon { font-size: 15px; color: #C89B3C; }
        .tex-type-label {
          font-size: 10px; font-weight: 600; letter-spacing: 0.06em;
          text-transform: uppercase; color: #C89B3C; flex: 1;
        }
        .tex-collapse-btn {
          background: none; border: none; cursor: pointer;
          font-size: 12px; color: #9A8F80; padding: 0;
        }

        .tex-body {
          padding: 10px 12px 8px;
          display: flex; flex-direction: column; gap: 14px;
          border-radius: 0 0 14px 14px; overflow: hidden;
        }

        .tex-spectrum { display: flex; flex-direction: column; gap: 6px; }

        .tex-label-row {
          display: flex; justify-content: space-between; cursor: pointer;
        }
        .tex-label {
          font-size: 11px; color: #6B5D50;
          font-family: 'Playfair Display', Georgia, serif; font-style: italic;
        }

        .tex-label-edit-row { display: flex; align-items: center; gap: 4px; }
        .tex-label-input {
          flex: 1; font-size: 11px;
          font-family: 'Playfair Display', Georgia, serif; font-style: italic;
          color: #1C1A17; border: none; border-bottom: 1px solid #C89B3C;
          background: transparent; outline: none; padding-bottom: 1px;
        }
        .tex-label-sep { font-size: 10px; color: #9A8F80; }
        .tex-remove-btn {
          background: none; border: none; cursor: pointer;
          font-size: 14px; color: #9A8F80; padding: 0; line-height: 1;
          transition: color 0.15s;
        }
        .tex-remove-btn:hover { color: #C0394B; }

        /* Custom track */
        .tex-track-wrap {
          height: 20px; display: flex; align-items: center;
        }
        .tex-track {
          position: relative; width: 100%; height: 6px;
          background: #EDE6D6; border-radius: 3px;
          cursor: ew-resize; user-select: none;
        }
        .tex-fill {
          position: absolute; left: 0; top: 0; height: 100%;
          background: #C89B3C; border-radius: 3px; pointer-events: none;
        }
        .tex-dot {
          position: absolute; top: 50%;
          transform: translate(-50%, -50%);
          width: 14px; height: 14px; border-radius: 50%;
          background: #C89B3C; border: 2.5px solid #F2EBD9;
          box-shadow: 0 1px 4px rgba(0,0,0,0.2);
          pointer-events: none;
          transition: transform 0.05s;
        }
        .tex-track:active .tex-dot {
          transform: translate(-50%, -50%) scale(1.2);
        }

        .tex-add-btn {
          font-size: 11px; color: #9A8F80;
          background: none; border: 1px dashed #C4B9A8;
          border-radius: 8px; padding: 5px 10px; cursor: pointer;
          width: 100%; text-align: center;
          font-family: 'DM Sans', system-ui, sans-serif; transition: all 0.15s;
        }
        .tex-add-btn:hover { border-color: #C89B3C; color: #C89B3C; }

        .tex-collapsed-preview {
          padding: 6px 12px 8px; display: flex; flex-direction: column; gap: 4px;
        }
        .tex-collapsed-item {
          display: flex; align-items: center; gap: 6px;
          font-size: 10px; color: #9A8F80;
        }
        .tex-collapsed-bar {
          flex: 1; height: 3px; background: #EDE6D6;
          border-radius: 2px; overflow: hidden;
        }
        .tex-collapsed-fill { height: 100%; background: #C89B3C; border-radius: 2px; }
      `}</style>
    </div>
  )
}