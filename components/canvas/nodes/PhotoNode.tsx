'use client'

import { useState, useRef, useCallback } from 'react'
import { Handle, Position, type NodeProps, NodeResizer } from '@xyflow/react'
import { createPortal } from 'react-dom'

interface PhotoData {
  label: string
  src: string | null
  caption: string
  timestamp: string
  [key: string]: unknown
}

export default function PhotoNode({ data, selected }: NodeProps) {
  const nodeData = data as PhotoData
  const [src, setSrc] = useState<string | null>(nodeData.src)
  const [caption, setCaption] = useState(nodeData.caption || '')
  const [editingCaption, setEditingCaption] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setSrc(result)
      nodeData.src = result
    }
    reader.readAsDataURL(file)
  }, [nodeData])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) loadFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) loadFile(file)
  }

  const formattedTime = new Date(nodeData.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div
      className={`photo-node ${selected ? 'photo-node--selected' : ''} ${collapsed ? 'photo-node--collapsed' : ''}`}
    >
      {!collapsed && (
        <NodeResizer
          minWidth={200}
          minHeight={180}
          isVisible={selected}
          lineStyle={{ border: '1.5px dashed rgba(90, 122, 74, 0.4)' }}
          handleStyle={{
            width: 10, height: 10,
            background: '#F2EBD9',
            border: '1.5px solid #5A7A4A',
            borderRadius: 3,
          }}
        />
      )}
      <Handle type="target" position={Position.Left} className="photo-handle" />
      <Handle type="source" position={Position.Right} className="photo-handle" />

      {/* Header */}
      <div className="photo-header">
        <span className="photo-label">Photo</span>
        <span className="photo-time">{formattedTime}</span>
        <button
          className="photo-collapse-btn"
          onClick={() => setCollapsed((v) => !v)}
        >
          {collapsed ? '▾' : '▴'}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Image area */}
          {src ? (
            <div className="photo-img-wrap">
              <img
                src={src}
                alt={caption || 'Photo'}
                className="photo-img"
                onClick={() => setLightboxOpen(true)}
                style={{ cursor: 'zoom-in' }}
              />
              <button
                className="photo-replace-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Replace photo"
              >
                ↺
              </button>
            </div>
          ) : (
            <div
              className={`photo-drop ${dragOver ? 'photo-drop--over' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <div className="photo-drop-icon">🖼</div>
              <p className="photo-drop-text">Drop photo or tap to upload</p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="photo-file-input"
            onChange={handleFileChange}
          />

          {/* Caption */}
          <div className="photo-caption-wrap">
            {editingCaption ? (
              <input
                className="photo-caption-input"
                value={caption}
                autoFocus
                onChange={(e) => setCaption(e.target.value)}
                onBlur={() => {
                  setEditingCaption(false)
                  nodeData.caption = caption
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'Escape') {
                    setEditingCaption(false)
                    nodeData.caption = caption
                  }
                }}
                placeholder="Add a caption..."
              />
            ) : (
              <p
                className={`photo-caption ${!caption ? 'photo-caption--empty' : ''}`}
                onClick={() => setEditingCaption(true)}
              >
                {caption || 'Add a caption...'}
              </p>
            )}
          </div>
        </>
      )}

      {collapsed && src && (
        <div className="photo-collapsed-thumb">
          <img src={src} alt={caption} className="photo-thumb-img" />
          {caption && <span className="photo-thumb-caption">{caption}</span>}
        </div>
      )}

      {lightboxOpen && src && typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'zoom-out',
          }}
          onClick={() => setLightboxOpen(false)}
        >
          <img
            src={src}
            alt={caption || 'Photo'}
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              objectFit: 'contain',
              borderRadius: 8,
              boxShadow: '0 8px 48px rgba(0,0,0,0.6)',
            }}
            onClick={e => e.stopPropagation()}
          />
          {caption && (
            <p style={{
              position: 'absolute',
              bottom: 32,
              left: 0, right: 0,
              textAlign: 'center',
              color: 'rgba(255,255,255,0.8)',
              fontFamily: 'Playfair Display, Georgia, serif',
              fontStyle: 'italic',
              fontSize: 14,
              margin: 0,
            }}>
              {caption}
            </p>
          )}
        </div>,
        document.body
      )}

      <style>{`
        .photo-node {
          width: 100%;
          height: 100%;
          background: #FDFAF4;
          border: 1.5px solid #C4B9A8;
          border-radius: 14px;
          font-family: 'DM Sans', system-ui, sans-serif;
          overflow: hidden;
          transition: box-shadow 0.2s, border-color 0.2s;
          display: flex;
          flex-direction: column;
        }

        .photo-node--selected {
          border-color: #5A7A4A;
          box-shadow: 0 0 0 3px rgba(90, 122, 74, 0.15);
        }

        .photo-handle {
          width: 8px !important;
          height: 8px !important;
          background: #5A7A4A !important;
          border: 2px solid #F2EBD9 !important;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .photo-node:hover .photo-handle,
        .photo-node--selected .photo-handle {
          opacity: 1;
        }

        .photo-header {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 12px 8px;
          border-bottom: 1px solid #EDE6D6;
        }

        .photo-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #5A7A4A;
          flex: 1;
        }

        .photo-time {
          font-size: 10px;
          color: #9A8F80;
          font-variant-numeric: tabular-nums;
        }

        .photo-collapse-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 12px;
          color: #9A8F80;
          padding: 0 0 0 4px;
        }

        .photo-img-wrap {
          position: relative;
          width: 100%;
          flex: 1;
          min-height: 0;
          overflow: hidden;
        }

        .photo-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
        }

        .photo-replace-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(242, 235, 217, 0.85);
          border: 1px solid #C4B9A8;
          cursor: pointer;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .photo-img-wrap:hover .photo-replace-btn {
          opacity: 1;
        }

        .photo-drop {
          margin: 10px 12px;
          border: 1.5px dashed #C4B9A8;
          border-radius: 10px;
          padding: 28px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
        }

        .photo-drop:hover,
        .photo-drop--over {
          border-color: #5A7A4A;
          background: rgba(90, 122, 74, 0.04);
        }

        .photo-drop-icon {
          font-size: 28px;
          color: #9A8F80;
          line-height: 1;
        }

        .photo-drop-text {
          font-size: 11px;
          color: #9A8F80;
          margin: 0;
          text-align: center;
        }

        .photo-file-input {
          display: none;
        }

        .photo-caption-wrap {
          padding: 8px 12px 10px;
          border-top: 1px solid #EDE6D6;
        }

        .photo-caption {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 12px;
          font-style: italic;
          color: #4A3D30;
          margin: 0;
          cursor: text;
          line-height: 1.5;
        }

        .photo-caption--empty {
          color: #B0A090;
        }

        .photo-caption-input {
          width: 100%;
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 12px;
          font-style: italic;
          color: #4A3D30;
          background: transparent;
          border: none;
          border-bottom: 1px solid #8B5E3C;
          outline: none;
          padding: 0 0 2px;
        }

        .photo-collapsed-thumb {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px 8px;
        }

        .photo-thumb-img {
          width: 36px;
          height: 36px;
          object-fit: cover;
          border-radius: 6px;
          flex-shrink: 0;
        }

        .photo-thumb-caption {
          font-size: 11px;
          font-style: italic;
          color: #6B5D50;
          font-family: 'Playfair Display', Georgia, serif;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `}</style>
    </div>
  )
}
