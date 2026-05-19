'use client'

import { useState } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'

const VARIABLE_TYPES = [
  { value: 'temperature', label: 'Temp',        unit: '°C',  icon: '🌡', color: '#C0394B' },
  { value: 'time',        label: 'Time',         unit: 'min', icon: '⏱', color: '#3B4A8A' },
  { value: 'salinity',    label: 'Salt',         unit: '%',   icon: '🧂', color: '#C89B3C' },
  { value: 'acidity',     label: 'Acidity',      unit: 'pH',  icon: '🍋', color: '#5A7A4A' },
  { value: 'hydration',   label: 'Hydration',    unit: '%',   icon: '💧', color: '#3B4A8A' },
  { value: 'fermentation',label: 'Fermentation', unit: 'hrs', icon: '🫧', color: '#8B5E3C' },
  { value: 'pressure',    label: 'Pressure',     unit: 'bar', icon: '⊙', color: '#6B5D50' },
  { value: 'humidity',    label: 'Humidity',     unit: '%',   icon: '💦', color: '#5A7A4A' },
]

interface VariableData {
  label: string
  variableType: string
  value: string
  unit: string
  result: string
  [key: string]: unknown
}

export default function VariableNode({ data, selected }: NodeProps) {
  const d = data as VariableData
  const [varType, setVarType] = useState(d.variableType || 'temperature')
  const [value, setValue] = useState(d.value || '')
  const [result, setResult] = useState(d.result || '')
  const [collapsed, setCollapsed] = useState(false)
  const [editingResult, setEditingResult] = useState(false)

  const active = VARIABLE_TYPES.find(v => v.value === varType) ?? VARIABLE_TYPES[0]

  const syncField = (key: string, val: string) => {
    (d as Record<string, unknown>)[key] = val
  }

  return (
    <div
      className={`var-node ${selected ? 'var-node--selected' : ''}`}
      style={{ '--var-color': active.color } as React.CSSProperties}
    >
      <Handle type="target" position={Position.Left} className="var-handle" />
      <Handle type="source" position={Position.Right} className="var-handle" />

      <div className="var-header">
        <span className="var-icon">{active.icon}</span>
        <span className="var-type-label">{active.label}</span>
        <button className="var-collapse-btn" onClick={() => setCollapsed(v => !v)}>
          {collapsed ? '▾' : '▴'}
        </button>
      </div>

      <div className="var-value-row">
        <input
          className="var-value-input"
          value={value}
          placeholder="—"
          onChange={e => { setValue(e.target.value); syncField('value', e.target.value) }}
        />
        <span className="var-unit">{active.unit}</span>
      </div>

      {!collapsed && (
        <>
          <div className="var-type-grid">
            {VARIABLE_TYPES.map(vt => (
              <button
                key={vt.value}
                className={`var-type-btn ${varType === vt.value ? 'var-type-btn--active' : ''}`}
                style={varType === vt.value ? { background: vt.color, color: '#F2EBD9', borderColor: vt.color } : {}}
                onClick={() => {
                  setVarType(vt.value)
                  syncField('variableType', vt.value)
                  syncField('unit', vt.unit)
                }}
              >
                {vt.label}
              </button>
            ))}
          </div>

          <div className="var-result-wrap">
            <span className="var-result-label">Result</span>
            {editingResult ? (
              <textarea
                className="var-result-input"
                value={result}
                autoFocus
                rows={2}
                placeholder="What happened at this value?"
                onChange={e => { setResult(e.target.value); syncField('result', e.target.value) }}
                onBlur={() => setEditingResult(false)}
              />
            ) : (
              <p
                className={`var-result-text ${!result ? 'var-result-text--empty' : ''}`}
                onClick={() => setEditingResult(true)}
              >
                {result || 'Tap to note the result...'}
              </p>
            )}
          </div>
        </>
      )}

      <style>{`
        .var-node {
          width: 240px;
          background: #FDFAF4;
          border: 1.5px solid #C4B9A8;
          border-radius: 14px;
          font-family: 'DM Sans', system-ui, sans-serif;
          overflow: hidden;
          transition: box-shadow 0.2s, border-color 0.2s;
        }
        .var-node--selected {
          border-color: var(--var-color, #3B4A8A);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--var-color, #3B4A8A) 20%, transparent);
        }
        .var-handle {
          width: 8px !important; height: 8px !important;
          background: var(--var-color, #3B4A8A) !important;
          border: 2px solid #F2EBD9 !important;
          opacity: 0; transition: opacity 0.2s;
        }
        .var-node:hover .var-handle,
        .var-node--selected .var-handle { opacity: 1; }

        .var-header {
          display: flex; align-items: center; gap: 7px;
          padding: 10px 12px 6px;
          border-bottom: 1px solid #EDE6D6;
        }
        .var-icon { font-size: 14px; line-height: 1; }
        .var-type-label {
          font-size: 10px; font-weight: 600;
          letter-spacing: 0.06em; text-transform: uppercase;
          color: var(--var-color, #3B4A8A); flex: 1;
        }
        .var-collapse-btn {
          background: none; border: none; cursor: pointer;
          font-size: 12px; color: #9A8F80; padding: 0;
        }

        .var-value-row {
          display: flex; align-items: baseline; gap: 4px;
          padding: 10px 14px 8px;
        }
        .var-value-input {
          font-family: 'JetBrains Mono', monospace;
          font-size: 32px; font-weight: 500;
          color: #1C1A17; background: transparent;
          border: none; outline: none; width: 100%;
          line-height: 1;
        }
        .var-value-input::placeholder { color: #C4B9A8; }
        .var-unit {
          font-family: 'JetBrains Mono', monospace;
          font-size: 14px; color: #9A8F80;
          flex-shrink: 0; padding-bottom: 4px;
        }

        .var-type-grid {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 3px; padding: 6px 10px 8px;
          border-top: 1px solid #EDE6D6;
        }
        .var-type-btn {
          font-size: 9px; font-weight: 500;
          padding: 4px 2px; border-radius: 6px;
          border: 1px solid #C4B9A8;
          background: transparent; color: #6B5D50;
          cursor: pointer; transition: all 0.12s;
          font-family: 'DM Sans', system-ui, sans-serif;
          text-align: center;
        }
        .var-type-btn:hover { border-color: var(--var-color, #3B4A8A); color: var(--var-color, #3B4A8A); }

        .var-result-wrap {
          padding: 8px 12px 10px;
          border-top: 1px solid #EDE6D6;
        }
        .var-result-label {
          display: block; font-size: 9px; font-weight: 600;
          letter-spacing: 0.07em; text-transform: uppercase;
          color: #9A8F80; margin-bottom: 4px;
        }
        .var-result-text {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 12px; line-height: 1.55; color: #1C1A17;
          margin: 0; cursor: text; min-height: 32px;
        }
        .var-result-text--empty { color: #B0A090; font-style: italic; }
        .var-result-input {
          width: 100%; font-family: 'Playfair Display', Georgia, serif;
          font-size: 12px; line-height: 1.55; color: #1C1A17;
          background: transparent; border: none; outline: none; resize: none;
          padding: 0;
        }
      `}</style>
    </div>
  )
}
