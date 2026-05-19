'use client'

import { useState } from 'react'

interface SessionCardProps {
  id: string
  title: string
  goal?: string
  tags?: string[]
  coverPhoto?: string | null
  nodeCount?: number
  published?: boolean
  updatedAt?: string
  createdAt?: string
  onOpen?: (id: string) => void
  onDuplicate?: (id: string) => void
  onDelete?: (id: string) => void
  onPublishToggle?: (id: string, published: boolean) => void
}

export default function SessionCard({
  id, title, goal, tags = [], coverPhoto,
  nodeCount = 0, published = false,
  updatedAt, createdAt,
  onOpen, onDuplicate, onDelete, onPublishToggle,
}: SessionCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const relativeTime = (iso?: string) => {
    if (!iso) return ''
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days}d ago`
    return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return (
    <div className="sc-card" onClick={() => onOpen?.(id)}>
      {/* Cover */}
      <div className="sc-cover">
        {coverPhoto ? (
          <img src={coverPhoto} alt={title} className="sc-cover-img" />
        ) : (
          <div className="sc-cover-empty">
            <span className="sc-cover-glyph">🌿</span>
          </div>
        )}

        {published && (
          <div className="sc-published-badge">
            <span className="sc-published-dot" />
            Published
          </div>
        )}

        {nodeCount > 0 && (
          <div className="sc-node-count">{nodeCount} objects</div>
        )}
      </div>

      {/* Body */}
      <div className="sc-body">
        <div className="sc-title-row">
          <h3 className="sc-title">{title || 'Untitled Session'}</h3>
          <button
            className="sc-menu-btn"
            onClick={e => { e.stopPropagation(); setMenuOpen(v => !v) }}
            title="Options"
          >
            ···
          </button>
        </div>

        {goal && <p className="sc-goal">{goal}</p>}

        {tags.length > 0 && (
          <div className="sc-tags">
            {tags.slice(0, 4).map(tag => (
              <span key={tag} className="sc-tag">{tag}</span>
            ))}
            {tags.length > 4 && (
              <span className="sc-tag sc-tag--more">+{tags.length - 4}</span>
            )}
          </div>
        )}

        <div className="sc-meta">
          <span className="sc-time">{relativeTime(updatedAt || createdAt)}</span>
        </div>
      </div>

      {/* Dropdown menu */}
      {menuOpen && (
        <>
          <div
            className="sc-menu-backdrop"
            onClick={e => { e.stopPropagation(); setMenuOpen(false); setConfirming(false) }}
          />
          <div className="sc-menu" onClick={e => e.stopPropagation()}>
            <button className="sc-menu-item" onClick={() => { onOpen?.(id); setMenuOpen(false) }}>
              Open
            </button>
            <button
              className="sc-menu-item"
              onClick={() => { onPublishToggle?.(id, !published); setMenuOpen(false) }}
            >
              {published ? 'Unpublish' : 'Publish'}
            </button>
            <button className="sc-menu-item" onClick={() => { onDuplicate?.(id); setMenuOpen(false) }}>
              Duplicate
            </button>
            <div className="sc-menu-divider" />
            {confirming ? (
              <div className="sc-menu-confirm">
                <span className="sc-menu-confirm-text">Delete?</span>
                <button
                  className="sc-menu-item sc-menu-item--danger"
                  onClick={() => { onDelete?.(id); setMenuOpen(false); setConfirming(false) }}
                >
                  Yes, delete
                </button>
                <button className="sc-menu-item" onClick={() => setConfirming(false)}>
                  Cancel
                </button>
              </div>
            ) : (
              <button
                className="sc-menu-item sc-menu-item--danger"
                onClick={() => setConfirming(true)}
              >
                Delete
              </button>
            )}
          </div>
        </>
      )}

      <style>{`
        .sc-card {
          background: #FDFAF4;
          border: 1.5px solid #C4B9A8;
          border-radius: 16px;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
          position: relative;
          display: flex;
          flex-direction: column;
        }
        .sc-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(60, 40, 20, 0.1);
          border-color: #8B5E3C;
        }

        .sc-cover {
          width: 100%; height: 140px;
          position: relative; overflow: hidden;
          background: #F5EFE3; flex-shrink: 0;
        }
        .sc-cover-img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .sc-cover-empty {
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #F5EFE3 0%, #EDE3D0 100%);
        }
        .sc-cover-glyph { font-size: 32px; line-height: 1; }

        .sc-published-badge {
          position: absolute; top: 10px; left: 10px;
          display: flex; align-items: center; gap: 5px;
          background: rgba(90, 122, 74, 0.9);
          color: #F2EBD9; font-size: 10px; font-weight: 600;
          letter-spacing: 0.05em; text-transform: uppercase;
          border-radius: 20px; padding: 3px 8px;
          font-family: 'DM Sans', system-ui, sans-serif;
        }
        .sc-published-dot {
          width: 5px; height: 5px; border-radius: 50%; background: #A8D08A;
        }

        .sc-node-count {
          position: absolute; bottom: 8px; right: 10px;
          font-size: 10px; color: rgba(242,235,217,0.85);
          background: rgba(28,26,23,0.45);
          border-radius: 20px; padding: 2px 7px;
          font-family: 'DM Sans', system-ui, sans-serif; font-weight: 500;
          backdrop-filter: blur(4px);
        }

        .sc-body { padding: 12px 14px 14px; display: flex; flex-direction: column; gap: 6px; flex: 1; }

        .sc-title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
        .sc-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 15px; font-weight: 600; color: #1C1A17; margin: 0;
          line-height: 1.3; overflow: hidden;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
        }
        .sc-menu-btn {
          background: none; border: none; cursor: pointer;
          font-size: 16px; color: #9A8F80; padding: 0 2px;
          line-height: 1; flex-shrink: 0; letter-spacing: 0.1em;
          transition: color 0.15s;
        }
        .sc-menu-btn:hover { color: #1C1A17; }

        .sc-goal {
          font-size: 12px; color: #6B5D50; margin: 0; font-style: italic;
          font-family: 'Playfair Display', Georgia, serif; overflow: hidden;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
          line-height: 1.45;
        }

        .sc-tags { display: flex; flex-wrap: wrap; gap: 4px; }
        .sc-tag {
          font-size: 10px; font-weight: 500;
          background: rgba(139,94,60,0.08); color: #8B5E3C;
          border-radius: 20px; padding: 2px 7px;
          font-family: 'DM Sans', system-ui, sans-serif;
        }
        .sc-tag--more { background: transparent; color: #9A8F80; border: 1px solid #C4B9A8; }

        .sc-meta { display: flex; align-items: center; margin-top: auto; padding-top: 4px; }
        .sc-time { font-size: 10px; color: #B0A090; font-family: 'DM Sans', system-ui, sans-serif; }

        .sc-menu-backdrop { position: fixed; inset: 0; z-index: 40; }
        .sc-menu {
          position: absolute; top: 44px; right: 14px;
          background: #FDFAF4; border: 1.5px solid #C4B9A8;
          border-radius: 12px; padding: 5px;
          box-shadow: 0 8px 24px rgba(60,40,20,0.12);
          z-index: 50; min-width: 140px;
          display: flex; flex-direction: column; gap: 1px;
        }
        .sc-menu-item {
          font-size: 13px; color: #1C1A17; background: none; border: none;
          cursor: pointer; padding: 8px 10px; border-radius: 8px; text-align: left;
          font-family: 'DM Sans', system-ui, sans-serif; transition: background 0.12s;
        }
        .sc-menu-item:hover { background: #F0E8D8; }
        .sc-menu-item--danger { color: #C0394B; }
        .sc-menu-item--danger:hover { background: rgba(192,57,75,0.08); }
        .sc-menu-divider { height: 1px; background: #EDE6D6; margin: 3px 6px; }
        .sc-menu-confirm { display: flex; flex-direction: column; gap: 2px; }
        .sc-menu-confirm-text {
          font-size: 11px; color: #9A8F80; padding: 4px 10px 2px;
          font-family: 'DM Sans', system-ui, sans-serif;
        }
      `}</style>
    </div>
  )
}
