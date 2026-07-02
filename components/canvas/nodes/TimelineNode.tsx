'use client'

import { useState } from 'react'
import { Handle, Position, type NodeProps, NodeResizer } from '@xyflow/react'

interface TimelineEvent {
  id: string
  time: string
  event: string
  note: string
}

interface TimelineData {
  label: string
  events: TimelineEvent[]
  [key: string]: unknown
}

export default function TimelineNode({ data, selected }: NodeProps) {
  const d = data as TimelineData
  const [events, setEvents] = useState<TimelineEvent[]>(d.events || [])
  const [collapsed, setCollapsed] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const syncEvents = (next: TimelineEvent[]) => {
    d.events = next
    setEvents(next)
  }

  const addEvent = () => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const newEvent: TimelineEvent = { id: Date.now().toString(), time, event: '', note: '' }
    const next = [...events, newEvent]
    syncEvents(next)
    setEditingId(newEvent.id)
  }

  const updateEvent = (id: string, field: keyof TimelineEvent, val: string) => {
    syncEvents(events.map(e => e.id === id ? { ...e, [field]: val } : e))
  }

  const removeEvent = (id: string) => syncEvents(events.filter(e => e.id !== id))

  return (
    <div className={`tl-node ${selected ? 'tl-node--selected' : ''}`}>
      {!collapsed && (
        <NodeResizer
          minWidth={200}
          minHeight={100}
          isVisible={selected}
          lineStyle={{ border: '1.5px dashed rgba(59, 74, 138, 0.4)' }}
          handleStyle={{ width: 10, height: 10, background: '#F2EBD9', border: '1.5px solid #3B4A8A', borderRadius: 3 }}
        />
      )}
      <Handle type="target" position={Position.Left} className="tl-handle" />
      <Handle type="source" position={Position.Right} className="tl-handle" />

      <div className="tl-header">
        <span className="tl-icon">⏱</span>
        <span className="tl-type-label">Timeline</span>
        <span className="tl-count">{events.length}</span>
        <button className="tl-collapse-btn" onClick={() => setCollapsed(v => !v)}>
          {collapsed ? '▾' : '▴'}
        </button>
      </div>

      {!collapsed && (
        <div className="tl-body">
          {events.length === 0 && (
            <p className="tl-empty">No events yet. Add your first moment.</p>
          )}

          <div className="tl-events">
            {events.map((evt, i) => (
              <div key={evt.id} className="tl-event">
                <div className="tl-dot-col">
                  <div className="tl-dot" />
                  {i < events.length - 1 && <div className="tl-line" />}
                </div>

                <div className="tl-event-content">
                  {editingId === evt.id ? (
                    <>
                      <input
                        className="tl-time-input"
                        value={evt.time}
                        placeholder="2:14 PM"
                        onChange={e => updateEvent(evt.id, 'time', e.target.value)}
                        autoFocus
                      />
                      <input
                        className="tl-event-input"
                        value={evt.event}
                        placeholder="What happened?"
                        onChange={e => updateEvent(evt.id, 'event', e.target.value)}
                      />
                      <input
                        className="tl-note-input"
                        value={evt.note}
                        placeholder="Additional note..."
                        onChange={e => updateEvent(evt.id, 'note', e.target.value)}
                        onBlur={() => setEditingId(null)}
                        onKeyDown={e => { if (e.key === 'Enter') setEditingId(null) }}
                      />
                    </>
                  ) : (
                    <div className="tl-event-display" onClick={() => setEditingId(evt.id)}>
                      <span className="tl-time">{evt.time}</span>
                      <span className="tl-event-text">
                        {evt.event || <em className="tl-placeholder">Tap to edit</em>}
                      </span>
                      {evt.note && <span className="tl-note">{evt.note}</span>}
                    </div>
                  )}
                  <button
                    className="tl-remove-btn"
                    onClick={() => removeEvent(evt.id)}
                    title="Remove"
                  >×</button>
                </div>
              </div>
            ))}
          </div>

          <button className="tl-add-btn" onClick={addEvent}>+ Add moment</button>
        </div>
      )}

      {collapsed && events.length > 0 && (
        <div className="tl-collapsed-preview">
          <span className="tl-collapsed-first">{events[0].time} → {events[0].event}</span>
          {events.length > 1 && (
            <span className="tl-collapsed-more">+{events.length - 1} more</span>
          )}
        </div>
      )}

      <style>{`
        .tl-node {
          width: 100%;
          height: 100%;
          background: #FDFAF4;
          border: 1.5px solid #C4B9A8;
          border-radius: 14px;
          font-family: 'DM Sans', system-ui, sans-serif;
          overflow: hidden;
          transition: box-shadow 0.2s, border-color 0.2s;
        }
        .tl-node--selected {
          border-color: #3B4A8A;
          box-shadow: 0 0 0 3px rgba(59, 74, 138, 0.15);
        }
        .tl-handle {
          width: 8px !important; height: 8px !important;
          background: #3B4A8A !important;
          border: 2px solid #F2EBD9 !important;
          opacity: 0; transition: opacity 0.2s;
        }
        .tl-node:hover .tl-handle,
        .tl-node--selected .tl-handle { opacity: 1; }

        .tl-header {
          display: flex; align-items: center; gap: 7px;
          padding: 10px 12px 8px;
          border-bottom: 1px solid #EDE6D6;
        }
        .tl-icon { font-size: 14px; color: #3B4A8A; }
        .tl-type-label {
          font-size: 10px; font-weight: 600;
          letter-spacing: 0.06em; text-transform: uppercase;
          color: #3B4A8A; flex: 1;
        }
        .tl-count {
          font-size: 10px; background: rgba(59,74,138,0.1);
          color: #3B4A8A; border-radius: 20px;
          padding: 1px 6px; font-weight: 600;
        }
        .tl-collapse-btn {
          background: none; border: none; cursor: pointer;
          font-size: 12px; color: #9A8F80; padding: 0;
        }

        .tl-body { padding: 10px 12px 8px; }
        .tl-empty {
          font-size: 12px; color: #B0A090; font-style: italic;
          text-align: center; padding: 8px 0; margin: 0;
        }

        .tl-events { display: flex; flex-direction: column; }
        .tl-event { display: flex; gap: 10px; position: relative; }

        .tl-dot-col {
          display: flex; flex-direction: column; align-items: center;
          padding-top: 3px; flex-shrink: 0;
        }
        .tl-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #3B4A8A; flex-shrink: 0;
          border: 2px solid #F2EBD9;
          box-shadow: 0 0 0 1px #3B4A8A;
        }
        .tl-line {
          width: 1px; flex: 1; min-height: 16px;
          background: linear-gradient(to bottom, #3B4A8A, #C4B9A8);
          margin: 3px 0;
        }

        .tl-event-content {
          flex: 1; display: flex; flex-direction: column; gap: 2px;
          padding-bottom: 12px; position: relative;
        }
        .tl-event-display { display: flex; flex-direction: column; gap: 1px; cursor: pointer; }
        .tl-time {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px; color: #9A8F80; font-variant-numeric: tabular-nums;
        }
        .tl-event-text {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 13px; color: #1C1A17; line-height: 1.4;
        }
        .tl-placeholder { color: #B0A090; font-style: italic; }
        .tl-note { font-size: 11px; color: #6B5D50; font-style: italic; font-family: 'DM Sans', system-ui, sans-serif; }

        .tl-time-input, .tl-event-input, .tl-note-input {
          width: 100%; background: transparent; border: none; outline: none;
          font-family: 'DM Sans', system-ui, sans-serif;
          border-bottom: 1px solid #EDE6D6; padding-bottom: 2px;
          transition: border-color 0.15s;
        }
        .tl-time-input:focus, .tl-event-input:focus, .tl-note-input:focus { border-bottom-color: #3B4A8A; }
        .tl-time-input { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #9A8F80; }
        .tl-event-input { font-family: 'Playfair Display', Georgia, serif; font-size: 13px; color: #1C1A17; }
        .tl-note-input { font-size: 11px; color: #6B5D50; }

        .tl-remove-btn {
          position: absolute; right: 0; top: 0;
          background: none; border: none; cursor: pointer;
          font-size: 14px; color: #C4B9A8; line-height: 1; padding: 0;
          opacity: 0; transition: opacity 0.15s, color 0.15s;
        }
        .tl-event-content:hover .tl-remove-btn { opacity: 1; }
        .tl-remove-btn:hover { color: #C0394B; }

        .tl-add-btn {
          width: 100%; font-size: 11px; color: #9A8F80;
          background: none; border: 1px dashed #C4B9A8;
          border-radius: 8px; padding: 5px 10px;
          cursor: pointer; text-align: center; margin-top: 4px;
          font-family: 'DM Sans', system-ui, sans-serif;
          transition: all 0.15s;
        }
        .tl-add-btn:hover { border-color: #3B4A8A; color: #3B4A8A; }

        .tl-collapsed-preview { display: flex; align-items: center; gap: 8px; padding: 5px 12px 8px; }
        .tl-collapsed-first {
          font-size: 11px; color: #6B5D50; font-style: italic;
          font-family: 'Playfair Display', Georgia, serif;
          flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .tl-collapsed-more {
          font-size: 10px; background: rgba(59,74,138,0.1);
          color: #3B4A8A; border-radius: 20px; padding: 1px 6px;
          font-weight: 600; flex-shrink: 0;
        }
      `}</style>
    </div>
  )
}
