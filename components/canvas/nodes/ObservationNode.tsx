'use client'

import { useState, useCallback } from 'react'
import { Handle, Position, type NodeProps, NodeResizer } from '@xyflow/react'

const SENSORY_CATEGORIES = [
  { value: 'general',  label: 'General',  color: '#8B5E3C' },
  { value: 'taste',    label: 'Taste',    color: '#C0394B' },
  { value: 'texture',  label: 'Texture',  color: '#D4622A' },
  { value: 'aroma',    label: 'Aroma',    color: '#5A7A4A' },
  { value: 'visual',   label: 'Visual',   color: '#3B4A8A' },
  { value: 'temp',     label: 'Temp',     color: '#C89B3C' },
]

interface ObservationData {
  label: string
  text: string
  category: string
  tags: string[]
  timestamp: string
  [key: string]: unknown
}

export default function ObservationNode({ data, selected }: NodeProps) {
  const nodeData = data as ObservationData
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(nodeData.text || '')
  const [category, setCategory] = useState(nodeData.category || 'general')
  const [collapsed, setCollapsed] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>(nodeData.tags || [])

  const activeCat = SENSORY_CATEGORIES.find((c) => c.value === category) ?? SENSORY_CATEGORIES[0]

  const addTag = useCallback(() => {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t)) {
      setTags((prev) => [...prev, t])
    }
    setTagInput('')
  }, [tagInput, tags])

  const removeTag = (tag: string) => setTags((t) => t.filter((x) => x !== tag))

  const formattedTime = new Date(nodeData.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div
      className={`obs-node ${selected ? 'obs-node--selected' : ''} ${collapsed ? 'obs-node--collapsed' : ''}`}
      onDoubleClick={() => setEditing(true)}
    >
      {!collapsed && (
        <NodeResizer
          minWidth={200}
          minHeight={140}
          isVisible={selected}
          lineStyle={{ border: '1.5px dashed rgba(139, 94, 60, 0.4)' }}
          handleStyle={{
            width: 10, height: 10,
            background: '#F2EBD9',
            border: '1.5px solid #8B5E3C',
            borderRadius: 3,
          }}
        />
      )}
      <Handle type="target" position={Position.Left} className="obs-handle" />
      <Handle type="source" position={Position.Right} className="obs-handle" />

      {/* Header */}
      <div className="obs-header">
        <span
          className="obs-cat-dot"
          style={{ background: activeCat.color }}
          title={activeCat.label}
        />
        <span className="obs-cat-label" style={{ color: activeCat.color }}>
          {activeCat.label}
        </span>
        <span className="obs-time">{formattedTime}</span>
        <button
          className="obs-collapse-btn"
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? '▾' : '▴'}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Body */}
          <div className="obs-body">
            {editing ? (
              <textarea
                className="obs-textarea"
                value={text}
                autoFocus
                onChange={(e) => setText(e.target.value)}
                onBlur={() => {
                  setEditing(false)
                  nodeData.text = text
                }}
                placeholder="Write your observation..."
              />
            ) : (
              <p
                className={`obs-text ${!text ? 'obs-text--empty' : ''}`}
                onClick={() => setEditing(true)}
              >
                {text || 'Double-click to add observation...'}
              </p>
            )}
          </div>

          {/* Category picker */}
          <div className="obs-cats">
            {SENSORY_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                className={`obs-cat-btn ${category === cat.value ? 'obs-cat-btn--active' : ''}`}
                style={
                  category === cat.value
                    ? { background: cat.color, color: '#F2EBD9', borderColor: cat.color }
                    : {}
                }
                onClick={() => {
                  setCategory(cat.value)
                  nodeData.category = cat.value
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Tags */}
          {(tags.length > 0 || editing) && (
            <div className="obs-tags">
              {tags.map((tag) => (
                <span key={tag} className="obs-tag">
                  {tag}
                  <button className="obs-tag-remove" onClick={() => removeTag(tag)}>×</button>
                </span>
              ))}
              <input
                className="obs-tag-input"
                placeholder="+ tag"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault()
                    addTag()
                  }
                }}
              />
            </div>
          )}
        </>
      )}

      {collapsed && text && (
        <p className="obs-collapsed-preview">{text.slice(0, 60)}{text.length > 60 ? '…' : ''}</p>
      )}

      <style>{`
        .obs-node {
          width: 100%;
          height: 100%;
          background: #FDFAF4;
          border: 1.5px solid #C4B9A8;
          border-radius: 14px;
          font-family: 'DM Sans', system-ui, sans-serif;
          cursor: default;
          transition: box-shadow 0.2s, border-color 0.2s;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .obs-node--selected {
          border-color: #8B5E3C;
          box-shadow: 0 0 0 3px rgba(139, 94, 60, 0.15);
        }

        .obs-handle {
          width: 8px !important;
          height: 8px !important;
          background: #8B5E3C !important;
          border: 2px solid #F2EBD9 !important;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .obs-node:hover .obs-handle,
        .obs-node--selected .obs-handle {
          opacity: 1;
        }

        .obs-header {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 12px 6px;
          border-bottom: 1px solid #EDE6D6;
        }

        .obs-cat-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .obs-cat-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          flex: 1;
        }

        .obs-time {
          font-size: 10px;
          color: #9A8F80;
          font-variant-numeric: tabular-nums;
        }

        .obs-collapse-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 12px;
          color: #9A8F80;
          padding: 0 0 0 4px;
          line-height: 1;
        }

        .obs-body {
          padding: 10px 12px 6px;
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }

        .obs-text {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 13px;
          line-height: 1.65;
          color: #1C1A17;
          margin: 0;
          cursor: text;
          min-height: 40px;
        }

        .obs-text--empty {
          color: #B0A090;
          font-style: italic;
        }

        .obs-textarea {
          width: 100%;
          flex: 1;
          min-height: 60px;
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 13px;
          line-height: 1.65;
          color: #1C1A17;
          background: transparent;
          border: none;
          outline: none;
          resize: none;
          padding: 0;
        }

        .obs-cats {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          padding: 6px 12px 8px;
        }

        .obs-cat-btn {
          font-size: 10px;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-weight: 500;
          padding: 2px 7px;
          border: 1px solid #C4B9A8;
          border-radius: 20px;
          background: transparent;
          color: #6B5D50;
          cursor: pointer;
          transition: all 0.15s;
        }

        .obs-cat-btn:hover {
          border-color: #8B5E3C;
          color: #8B5E3C;
        }

        .obs-cat-btn--active {
          font-weight: 600;
        }

        .obs-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          padding: 4px 12px 10px;
          border-top: 1px solid #EDE6D6;
        }

        .obs-tag {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 10px;
          background: rgba(139, 94, 60, 0.1);
          color: #8B5E3C;
          border-radius: 20px;
          padding: 2px 6px;
          font-weight: 500;
        }

        .obs-tag-remove {
          background: none;
          border: none;
          cursor: pointer;
          color: #8B5E3C;
          font-size: 12px;
          line-height: 1;
          padding: 0;
          opacity: 0.6;
        }

        .obs-tag-input {
          font-size: 10px;
          border: none;
          outline: none;
          background: transparent;
          color: #6B5D50;
          width: 50px;
          font-family: 'DM Sans', system-ui, sans-serif;
        }

        .obs-tag-input::placeholder {
          color: #B0A090;
        }

        .obs-collapsed-preview {
          padding: 6px 12px 8px;
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 12px;
          color: #6B5D50;
          margin: 0;
          font-style: italic;
        }
      `}</style>
    </div>
  )
}
