'use client'

import { useState, useRef, useCallback } from 'react'
import { Handle, Position, type NodeProps, NodeResizer } from '@xyflow/react'
import PairingGraph from '@/components/PairingGraph'

interface PairingGraphData {
  ingredientName: string
  label?: string
  [key: string]: unknown
}

export default function PairingGraphNode({ data, selected }: NodeProps) {
  const d = data as PairingGraphData
  const [ingredientInput, setIngredientInput] = useState(d.ingredientName || '')
  const [activeIngredient, setActiveIngredient] = useState(d.ingredientName || '')
  const [collapsed, setCollapsed] = useState(false)
  const innerRef = useRef<HTMLDivElement>(null)

  const stopPropagation = useCallback((e: React.WheelEvent | React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
  }, [])

  const handleSearch = () => {
    const trimmed = ingredientInput.trim()
    if (!trimmed) return
    setActiveIngredient(trimmed)
    d.ingredientName = trimmed
  }

  return (
    <div
      className={`pgn-node ${selected ? 'pgn-node--selected' : ''} ${collapsed ? 'pgn-node--collapsed' : ''}`}
      onWheel={stopPropagation}
      onMouseDown={stopPropagation}
      onTouchStart={stopPropagation}
    >
      {!collapsed && (
        <NodeResizer
          minWidth={320}
          minHeight={360}
          isVisible={selected}
          lineStyle={{ border: '1.5px dashed rgba(192, 57, 75, 0.4)' }}
          handleStyle={{
            width: 10, height: 10,
            background: '#F2EBD9',
            border: '1.5px solid #C0394B',
            borderRadius: 3,
          }}
        />
      )}

      <Handle type="target" position={Position.Left} className="pgn-handle" />
      <Handle type="source" position={Position.Right} className="pgn-handle" />

      <div className="pgn-header">
        <span className="pgn-icon">↭</span>
        <span className="pgn-type-label">Flavor Pairing</span>
        {activeIngredient && (
          <span className="pgn-active-chip">{activeIngredient}</span>
        )}
        <button
          className="pgn-collapse-btn"
          onClick={() => setCollapsed(v => !v)}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? '▾' : '▴'}
        </button>
      </div>

      {!collapsed && (
        <div className="pgn-search-row">
          <input
            className="pgn-search-input"
            value={ingredientInput}
            placeholder="Enter an ingredient..."
            onChange={e => setIngredientInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
            onMouseDown={e => e.stopPropagation()}
          />
          <button className="pgn-search-btn" onClick={handleSearch}>Explore</button>
        </div>
      )}

      {!collapsed && (
        <div
          ref={innerRef}
          className="pgn-graph-wrap"
          onMouseDown={e => e.stopPropagation()}
          onTouchStart={e => e.stopPropagation()}
          onWheel={e => e.stopPropagation()}
        >
          {activeIngredient ? (
            <PairingGraph
              ingredientName={activeIngredient}
              key={activeIngredient}
            />
          ) : (
            <div className="pgn-empty">
              <span className="pgn-empty-icon">↭</span>
              <p className="pgn-empty-text">
                Enter an ingredient above to explore its flavor relationships
              </p>
            </div>
          )}
        </div>
      )}

      {collapsed && activeIngredient && (
        <div className="pgn-collapsed-preview">
          <span className="pgn-collapsed-label">{activeIngredient}</span>
          <span className="pgn-collapsed-hint">flavor graph</span>
        </div>
      )}

      <style>{`
        .pgn-node {
          width: 420px;
          min-height: 44px;
          background: #1C1A17;
          border: 1.5px solid #3D2B1F;
          border-radius: 16px;
          font-family: 'DM Sans', system-ui, sans-serif;
          overflow: hidden;
          transition: box-shadow 0.2s, border-color 0.2s;
          display: flex;
          flex-direction: column;
        }
        .pgn-node--selected {
          border-color: #C0394B;
          box-shadow: 0 0 0 3px rgba(192, 57, 75, 0.18);
        }
        .pgn-node--collapsed { width: 260px; }

        .pgn-handle {
          width: 8px !important; height: 8px !important;
          background: #C0394B !important;
          border: 2px solid #1C1A17 !important;
          opacity: 0; transition: opacity 0.2s;
        }
        .pgn-node:hover .pgn-handle,
        .pgn-node--selected .pgn-handle { opacity: 1; }

        .pgn-header {
          display: flex; align-items: center; gap: 7px;
          padding: 10px 12px 8px;
          border-bottom: 1px solid #2C1F1A;
          flex-shrink: 0;
        }
        .pgn-icon { font-size: 13px; color: #C0394B; }
        .pgn-type-label {
          font-size: 10px; font-weight: 600;
          letter-spacing: 0.06em; text-transform: uppercase;
          color: #C0394B; flex: 1;
        }
        .pgn-active-chip {
          font-size: 10px; font-weight: 500;
          font-family: 'Playfair Display', Georgia, serif;
          font-style: italic; color: #C8A86B;
          background: rgba(200, 168, 107, 0.12);
          border: 1px solid rgba(200, 168, 107, 0.2);
          border-radius: 20px; padding: 2px 8px;
          max-width: 120px; overflow: hidden;
          text-overflow: ellipsis; white-space: nowrap;
        }
        .pgn-collapse-btn {
          background: none; border: none; cursor: pointer;
          font-size: 12px; color: #6B5D50; padding: 0;
          transition: color 0.15s;
        }
        .pgn-collapse-btn:hover { color: #C0394B; }

        .pgn-search-row {
          display: flex; gap: 6px; padding: 8px 12px;
          border-bottom: 1px solid #2C1F1A; flex-shrink: 0;
        }
        .pgn-search-input {
          flex: 1; font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 12px; color: #F2EBD9;
          background: rgba(255,255,255,0.05);
          border: 1px solid #3D2B1F; border-radius: 8px;
          padding: 6px 10px; outline: none;
          transition: border-color 0.15s; min-width: 0;
        }
        .pgn-search-input:focus { border-color: #C0394B; }
        .pgn-search-input::placeholder { color: #6B5D50; }
        .pgn-search-btn {
          font-size: 11px; font-weight: 600;
          font-family: 'DM Sans', system-ui, sans-serif;
          color: #F2EBD9; background: #C0394B;
          border: none; border-radius: 8px; padding: 6px 12px;
          cursor: pointer; white-space: nowrap;
          transition: background 0.15s; flex-shrink: 0;
        }
        .pgn-search-btn:hover { background: #A02E3D; }

        .pgn-graph-wrap {
          flex: 1; min-height: 320px;
          position: relative; overflow: hidden;
          border-radius: 0 0 14px 14px;
        }

        .pgn-empty {
          position: absolute; inset: 0;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 12px; background: #1C1A17;
        }
        .pgn-empty-icon { font-size: 32px; color: #3D2B1F; line-height: 1; }
        .pgn-empty-text {
          font-size: 12px; color: #6B5D50;
          text-align: center; max-width: 200px; margin: 0;
          line-height: 1.5;
          font-family: 'Playfair Display', Georgia, serif;
          font-style: italic;
        }

        .pgn-collapsed-preview {
          display: flex; align-items: center; gap: 8px;
          padding: 6px 12px 10px;
        }
        .pgn-collapsed-label {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 13px; font-style: italic;
          color: #C8A86B; font-weight: 600;
        }
        .pgn-collapsed-hint { font-size: 10px; color: #6B5D50; letter-spacing: 0.04em; }
      `}</style>
    </div>
  )
}
