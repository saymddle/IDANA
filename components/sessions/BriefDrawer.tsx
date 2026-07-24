'use client'

import { sessionCategory, categoryColor } from '@/lib/categories'

export interface BriefSession {
  id: string
  title: string
  goal?: string
  tags?: string[]
  category?: string | null
  brief?: string | null
  hypothesis?: string | null
  method?: string | null
  published: boolean
  node_count: number
  created_at: string
  updated_at: string
}

interface BriefDrawerProps {
  session: BriefSession | null
  onClose: () => void
  onOpenCanvas: (id: string) => void
  onDuplicate: (id: string) => void
  onTogglePublish: (id: string, published: boolean) => void
  onDelete: (id: string) => void
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function BriefDrawer({
  session, onClose, onOpenCanvas, onDuplicate, onTogglePublish, onDelete,
}: BriefDrawerProps) {
  if (!session) return null

  const cat = sessionCategory(session)
  const catColor = categoryColor(cat)
  const tags = session.tags ?? []

  return (
    <>
      <div className="bd-backdrop" onClick={onClose} />
      <aside className="bd-panel" role="dialog" aria-label="Session brief">
        <div className="bd-inner">
          <div className="bd-top">
            <span className="bd-cat" style={{ color: catColor }}>{cat || 'Session'}</span>
            <button className="bd-close" onClick={onClose} aria-label="Close">×</button>
          </div>

          <h2 className="bd-title">{session.title}</h2>

          <div className="bd-meta">
            <div className="bd-meta-item">
              <span className="bd-meta-label">Created</span>
              <span className="bd-meta-value">{fmtDate(session.created_at)}</span>
            </div>
            <div className="bd-meta-item">
              <span className="bd-meta-label">Updated</span>
              <span className="bd-meta-value">{fmtDate(session.updated_at)}</span>
            </div>
            <div className="bd-meta-item">
              <span className="bd-meta-label">Nodes</span>
              <span className="bd-meta-value">{session.node_count}</span>
            </div>
          </div>

          <BriefSection label="The brief" body={session.brief} serif empty="No brief written yet." />
          <BriefSection label="Hypothesis" body={session.hypothesis} empty="No hypothesis captured." />
          <BriefSection label="Method" body={session.method || session.goal} empty="No method noted." />

          {tags.length > 0 && (
            <div className="bd-tags">
              {tags.map(t => <span key={t} className="bd-tag">{t}</span>)}
            </div>
          )}

          <button className="bd-open" onClick={() => onOpenCanvas(session.id)}>
            Open on canvas →
          </button>

          <div className="bd-actions">
            <button className="bd-action" onClick={() => onDuplicate(session.id)}>Duplicate</button>
            <button className="bd-action" onClick={() => onTogglePublish(session.id, !session.published)}>
              {session.published ? 'Unpublish' : 'Publish'}
            </button>
            <button className="bd-action bd-action--danger" onClick={() => onDelete(session.id)}>Delete</button>
          </div>
        </div>
      </aside>

      <style>{`
        .bd-backdrop {
          position: fixed; inset: 0;
          background: rgba(28,26,23,0.34);
          z-index: 60;
          animation: bd-fade 0.18s ease;
        }
        @keyframes bd-fade { from { opacity: 0 } to { opacity: 1 } }
        .bd-panel {
          position: fixed; top: 0; right: 0; bottom: 0;
          width: min(444px, 94vw);
          background: #F5EFE3;
          border-left: 1px solid #C4B9A8;
          box-shadow: -10px 0 34px rgba(28,26,23,0.20);
          z-index: 61;
          overflow-y: auto;
          animation: bd-slide 0.24s ease;
          font-family: 'DM Sans', system-ui, sans-serif;
        }
        @keyframes bd-slide { from { transform: translateX(24px); opacity: 0.4 } to { transform: translateX(0); opacity: 1 } }
        .bd-inner { padding: 24px 28px 30px; }

        .bd-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
        .bd-cat {
          font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 600;
        }
        .bd-close {
          width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;
          border: 1px solid #C4B9A8; background: #FDFAF4; border-radius: 8px;
          cursor: pointer; color: #6B5D50; font-size: 15px; transition: background 0.15s;
        }
        .bd-close:hover { background: #EDE6D6; }

        .bd-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-weight: 500; font-size: 25px; line-height: 1.22; color: #1C1A17; margin: 0 0 12px;
        }

        .bd-meta {
          display: flex; flex-wrap: wrap; gap: 18px;
          margin-bottom: 22px; padding-bottom: 20px; border-bottom: 1px solid #E4DAC6;
        }
        .bd-meta-item { display: flex; flex-direction: column; }
        .bd-meta-label { font-size: 9.5px; letter-spacing: 0.08em; text-transform: uppercase; color: #9A8F80; }
        .bd-meta-value { font-size: 13px; color: #1C1A17; }

        .bd-section { margin-bottom: 18px; }
        .bd-section-label {
          font-size: 10px; letter-spacing: 0.09em; text-transform: uppercase; color: #9A8F80; margin-bottom: 6px;
        }
        .bd-section-body { font-size: 13.5px; line-height: 1.55; color: #4A3D30; margin: 0; white-space: pre-wrap; }
        .bd-section-body--serif {
          font-family: 'Playfair Display', Georgia, serif; font-size: 15px; color: #1C1A17;
        }
        .bd-section-body--empty { color: #B0A090; font-style: italic; }

        .bd-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 24px; }
        .bd-tag {
          font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: #6B5D50;
          background: #EDE6D6; padding: 3px 9px; border-radius: 6px;
        }

        .bd-open {
          width: 100%; font-size: 14px; font-weight: 600; color: #F5EFE3;
          background: #8B5E3C; border: none; border-radius: 11px; padding: 13px;
          cursor: pointer; margin-bottom: 10px; transition: background 0.15s; font-family: inherit;
        }
        .bd-open:hover { background: #734c30; }

        .bd-actions { display: flex; gap: 8px; }
        .bd-action {
          flex: 1; font-size: 12.5px; color: #1C1A17; font-family: inherit;
          background: #FDFAF4; border: 1px solid #C4B9A8; border-radius: 9px; padding: 9px;
          cursor: pointer; transition: background 0.15s;
        }
        .bd-action:hover { background: #EDE6D6; }
        .bd-action--danger {
          flex: none; color: #C0394B; background: rgba(192,57,75,0.06);
          border-color: rgba(192,57,75,0.4); padding: 9px 14px;
        }
        .bd-action--danger:hover { background: rgba(192,57,75,0.14); }
      `}</style>
    </>
  )
}

function BriefSection({ label, body, serif, empty }: {
  label: string; body?: string | null; serif?: boolean; empty: string
}) {
  const has = !!(body && body.trim())
  return (
    <div className="bd-section">
      <div className="bd-section-label">{label}</div>
      <p className={`bd-section-body ${serif ? 'bd-section-body--serif' : ''} ${has ? '' : 'bd-section-body--empty'}`}>
        {has ? body : empty}
      </p>
    </div>
  )
}
