'use client'

import { useState } from 'react'
import { Handle, Position, type NodeProps, NodeResizer } from '@xyflow/react'

const PREP_STATES = ['raw', 'toasted', 'smoked', 'fermented', 'dried', 'pickled', 'ground', 'charred', 'roasted', 'fresh']

interface IngredientData {
  label: string
  name: string
  source: string
  prepState: string
  freshness: string
  substitutions: string
  notes: string
  onExplorePairings?: (name: string, nodeId: string) => void
  [key: string]: unknown
}

export default function IngredientNode({ data, selected, id }: NodeProps) {
  const d = data as IngredientData
  const [name, setName] = useState(d.name || '')
  const [source, setSource] = useState(d.source || '')
  const [prepState, setPrepState] = useState(d.prepState || '')
  const [freshness, setFreshness] = useState(d.freshness || '')
  const [substitutions, setSubstitutions] = useState(d.substitutions || '')
  const [notes, setNotes] = useState(d.notes || '')
  const [collapsed, setCollapsed] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const syncField = (key: keyof IngredientData, val: string) => {
    (d as Record<string, unknown>)[key] = val
  }

  return (
    <div className={`ing-node ${selected ? 'ing-node--selected' : ''}`}>
      {!collapsed && (
        <NodeResizer
          minWidth={200}
          minHeight={100}
          isVisible={selected}
          lineStyle={{ border: '1.5px dashed rgba(212, 98, 42, 0.4)' }}
          handleStyle={{ width: 10, height: 10, background: '#F2EBD9', border: '1.5px solid #D4622A', borderRadius: 3 }}
        />
      )}
      <Handle type="target" position={Position.Left} className="ing-handle" />
      <Handle type="source" position={Position.Right} className="ing-handle ing-handle--source" />

      <div className="ing-header">
        <span className="ing-icon">🌿</span>
        <span className="ing-type-label">Ingredient</span>
        <button className="ing-collapse-btn" onClick={() => setCollapsed(v => !v)}>
          {collapsed ? '▾' : '▴'}
        </button>
      </div>

      <div className="ing-name-row">
        <input
          className="ing-name-input"
          value={name}
          placeholder="Ingredient name..."
          onChange={e => { setName(e.target.value); syncField('name', e.target.value) }}
        />
      </div>

      {!collapsed && (
        <>
          <div className="ing-prep-row">
            {PREP_STATES.map(ps => (
              <button
                key={ps}
                className={`ing-prep-chip ${prepState === ps ? 'ing-prep-chip--active' : ''}`}
                onClick={() => { setPrepState(ps); syncField('prepState', ps) }}
              >
                {ps}
              </button>
            ))}
          </div>

          <div className="ing-fields">
            <div className="ing-field">
              <label className="ing-field-label">Source / Vendor</label>
              <input
                className="ing-field-input"
                value={source}
                placeholder="e.g. Lagos supplier"
                onChange={e => { setSource(e.target.value); syncField('source', e.target.value) }}
              />
            </div>
            <div className="ing-field">
              <label className="ing-field-label">Freshness</label>
              <input
                className="ing-field-input"
                value={freshness}
                placeholder="e.g. peak, day 2"
                onChange={e => { setFreshness(e.target.value); syncField('freshness', e.target.value) }}
              />
            </div>
          </div>

          {expanded && (
            <div className="ing-fields">
              <div className="ing-field">
                <label className="ing-field-label">Substitutions</label>
                <input
                  className="ing-field-input"
                  value={substitutions}
                  placeholder="e.g. smoked paprika"
                  onChange={e => { setSubstitutions(e.target.value); syncField('substitutions', e.target.value) }}
                />
              </div>
              <div className="ing-field">
                <label className="ing-field-label">Notes</label>
                <textarea
                  className="ing-field-textarea"
                  value={notes}
                  placeholder="Any additional notes..."
                  rows={2}
                  onChange={e => { setNotes(e.target.value); syncField('notes', e.target.value) }}
                />
              </div>
            </div>
          )}

          <div className="ing-footer">
            <button className="ing-expand-btn" onClick={() => setExpanded(v => !v)}>
              {expanded ? 'Less' : 'More fields'}
            </button>
            <button
              className="ing-pairing-btn"
              onClick={() => { if (name.trim()) d.onExplorePairings?.(name.trim(), id) }}
              disabled={!name.trim()}
              style={{ opacity: name.trim() ? 1 : 0.4 }}
            >
              ↭ Explore Pairings
            </button>
          </div>
        </>
      )}

      {collapsed && name && (
        <div className="ing-collapsed-row">
          {prepState && <span className="ing-collapsed-prep">{prepState}</span>}
          {source && <span className="ing-collapsed-source">{source}</span>}
        </div>
      )}

      <style>{`
        .ing-node {
          width: 100%;
          height: 100%;
          background: #FDFAF4;
          border: 1.5px solid #C4B9A8;
          border-radius: 14px;
          font-family: 'DM Sans', system-ui, sans-serif;
          overflow: hidden;
          transition: box-shadow 0.2s, border-color 0.2s;
        }
        .ing-node--selected {
          border-color: #D4622A;
          box-shadow: 0 0 0 3px rgba(212, 98, 42, 0.15);
        }
        .ing-handle {
          width: 8px !important; height: 8px !important;
          background: #D4622A !important;
          border: 2px solid #F2EBD9 !important;
          opacity: 0; transition: opacity 0.2s;
        }
        .ing-node:hover .ing-handle,
        .ing-node--selected .ing-handle { opacity: 1; }
        .ing-handle--source { background: #C0394B !important; }

        .ing-header {
          display: flex; align-items: center; gap: 7px;
          padding: 10px 12px 8px;
          border-bottom: 1px solid #EDE6D6;
        }
        .ing-icon { font-size: 13px; color: #D4622A; }
        .ing-type-label {
          font-size: 10px; font-weight: 600;
          letter-spacing: 0.06em; text-transform: uppercase;
          color: #D4622A; flex: 1;
        }
        .ing-collapse-btn {
          background: none; border: none; cursor: pointer;
          font-size: 12px; color: #9A8F80; padding: 0;
        }

        .ing-name-row { padding: 10px 12px 6px; }
        .ing-name-input {
          width: 100%;
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 16px; font-weight: 600;
          color: #1C1A17; background: transparent;
          border: none; outline: none;
          border-bottom: 1px solid transparent;
          transition: border-color 0.15s;
          padding-bottom: 2px;
        }
        .ing-name-input:focus { border-bottom-color: #D4622A; }
        .ing-name-input::placeholder { color: #B0A090; font-weight: 400; }

        .ing-prep-row {
          display: flex; flex-wrap: wrap; gap: 4px;
          padding: 4px 12px 8px;
        }
        .ing-prep-chip {
          font-size: 10px; font-weight: 500;
          padding: 2px 8px; border-radius: 20px;
          border: 1px solid #C4B9A8;
          background: transparent; color: #6B5D50;
          cursor: pointer; transition: all 0.12s;
        }
        .ing-prep-chip:hover { border-color: #D4622A; color: #D4622A; }
        .ing-prep-chip--active {
          background: #D4622A; color: #F2EBD9;
          border-color: #D4622A; font-weight: 600;
        }

        .ing-fields {
          display: flex; flex-direction: column; gap: 8px;
          padding: 6px 12px 4px;
          border-top: 1px solid #EDE6D6;
        }
        .ing-field { display: flex; flex-direction: column; gap: 3px; }
        .ing-field-label {
          font-size: 10px; font-weight: 600;
          letter-spacing: 0.05em; text-transform: uppercase;
          color: #9A8F80;
        }
        .ing-field-input {
          font-size: 12px; color: #1C1A17;
          background: transparent; border: none;
          border-bottom: 1px solid #EDE6D6; outline: none;
          padding-bottom: 3px; font-family: 'DM Sans', system-ui, sans-serif;
          transition: border-color 0.15s;
        }
        .ing-field-input:focus { border-bottom-color: #D4622A; }
        .ing-field-input::placeholder { color: #B0A090; }
        .ing-field-textarea {
          font-size: 12px; color: #1C1A17; line-height: 1.5;
          background: transparent; border: 1px solid #EDE6D6;
          border-radius: 6px; outline: none; resize: none;
          padding: 6px 8px; font-family: 'DM Sans', system-ui, sans-serif;
          transition: border-color 0.15s;
        }
        .ing-field-textarea:focus { border-color: #D4622A; }

        .ing-footer {
          display: flex; align-items: center; justify-content: space-between;
          padding: 8px 12px 10px;
          border-top: 1px solid #EDE6D6;
        }
        .ing-expand-btn {
          font-size: 11px; color: #9A8F80; background: none;
          border: none; cursor: pointer; font-family: 'DM Sans', system-ui, sans-serif;
          padding: 0; transition: color 0.15s;
        }
        .ing-expand-btn:hover { color: #D4622A; }
        .ing-pairing-btn {
          font-size: 11px; font-weight: 600;
          color: #C0394B; background: rgba(192, 57, 75, 0.08);
          border: 1px solid rgba(192, 57, 75, 0.2);
          border-radius: 20px; padding: 4px 10px;
          cursor: pointer; font-family: 'DM Sans', system-ui, sans-serif;
          transition: all 0.15s;
        }
        .ing-pairing-btn:hover {
          background: rgba(192, 57, 75, 0.15);
          border-color: #C0394B;
        }

        .ing-collapsed-row {
          display: flex; align-items: center; gap: 6px;
          padding: 4px 12px 8px;
        }
        .ing-collapsed-prep {
          font-size: 10px; font-weight: 600;
          background: rgba(212,98,42,0.1); color: #D4622A;
          border-radius: 20px; padding: 2px 7px;
        }
        .ing-collapsed-source {
          font-size: 11px; color: #9A8F80;
          font-style: italic;
        }
      `}</style>
    </div>
  )
}
