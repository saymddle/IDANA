'use client'

import { useState, useRef } from 'react'
import { Handle, Position, type NodeProps, NodeResizer } from '@xyflow/react'

interface Comment {
  id: string
  text: string
  author: string
  createdAt: string
  resolved: boolean
}

interface CommentData {
  sessionId: string
  nodeId?: string
  comments: Comment[]
  label?: string
  [key: string]: unknown
}

export default function CommentNode({ data, selected }: NodeProps) {
  const d = data as CommentData
  const [comments, setComments] = useState<Comment[]>(d.comments || [])
  const [draft, setDraft] = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const unresolvedCount = comments.filter(c => !c.resolved).length

  const addComment = () => {
    const text = draft.trim()
    if (!text) return
    const newComment: Comment = {
      id: Date.now().toString(),
      text,
      author: 'You',
      createdAt: new Date().toISOString(),
      resolved: false,
    }
    const next = [...comments, newComment]
    setComments(next)
    d.comments = next
    setDraft('')
  }

  const toggleResolved = (commentId: string) => {
    const next = comments.map(c =>
      c.id === commentId ? { ...c, resolved: !c.resolved } : c
    )
    setComments(next)
    d.comments = next
  }

  const deleteComment = (commentId: string) => {
    const next = comments.filter(c => c.id !== commentId)
    setComments(next)
    d.comments = next
  }

  const relativeTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div className={`cm-node ${selected ? 'cm-node--selected' : ''}`}>
      {!collapsed && (
        <NodeResizer
          minWidth={200}
          minHeight={120}
          isVisible={selected}
          lineStyle={{ border: '1.5px dashed rgba(200, 155, 60, 0.4)' }}
          handleStyle={{ width: 10, height: 10, background: '#F2EBD9', border: '1.5px solid #C89B3C', borderRadius: 3 }}
        />
      )}
      <Handle type="target" position={Position.Left} className="cm-handle" />
      <Handle type="source" position={Position.Right} className="cm-handle" />

      <div className="cm-header">
        <span className="cm-icon">💬</span>
        <span className="cm-type-label">Comments</span>
        {unresolvedCount > 0 && (
          <span className="cm-badge">{unresolvedCount}</span>
        )}
        <button className="cm-collapse-btn" onClick={() => setCollapsed(v => !v)}>
          {collapsed ? '▾' : '▴'}
        </button>
      </div>

      {!collapsed && (
        <>
          <div className="cm-list">
            {comments.length === 0 && (
              <p className="cm-empty">No comments yet.</p>
            )}
            {comments.map(comment => (
              <div
                key={comment.id}
                className={`cm-comment ${comment.resolved ? 'cm-comment--resolved' : ''}`}
              >
                <div className="cm-comment-header">
                  <span className="cm-author">{comment.author}</span>
                  <span className="cm-time">{relativeTime(comment.createdAt)}</span>
                  <button
                    className="cm-resolve-btn"
                    onClick={() => toggleResolved(comment.id)}
                    title={comment.resolved ? 'Reopen' : 'Resolve'}
                  >
                    {comment.resolved ? '↩' : '✓'}
                  </button>
                  <button
                    className="cm-delete-btn"
                    onClick={() => deleteComment(comment.id)}
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
                <p className="cm-text">{comment.text}</p>
              </div>
            ))}
          </div>

          <div className="cm-input-wrap">
            <textarea
              ref={inputRef}
              className="cm-input"
              placeholder="Add a comment..."
              value={draft}
              rows={2}
              onChange={e => setDraft(e.target.value)}
              onMouseDown={e => e.stopPropagation()}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  addComment()
                }
              }}
            />
            <button
              className="cm-submit-btn"
              onClick={addComment}
              disabled={!draft.trim()}
            >
              Post
            </button>
          </div>
        </>
      )}

      {collapsed && comments.length > 0 && (
        <div className="cm-collapsed-preview">
          <span className="cm-collapsed-text">
            {comments[comments.length - 1]?.text.slice(0, 50)}
            {(comments[comments.length - 1]?.text.length ?? 0) > 50 ? '…' : ''}
          </span>
        </div>
      )}

      <style>{`
        .cm-node {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          background: #FDFAF4;
          border: 1.5px solid #C4B9A8;
          border-radius: 14px;
          font-family: 'DM Sans', system-ui, sans-serif;
          overflow: hidden;
          transition: box-shadow 0.2s, border-color 0.2s;
        }
        .cm-node--selected {
          border-color: #C89B3C;
          box-shadow: 0 0 0 3px rgba(200,155,60,0.15);
        }
        .cm-handle {
          width: 8px !important; height: 8px !important;
          background: #C89B3C !important;
          border: 2px solid #F2EBD9 !important;
          opacity: 0; transition: opacity 0.2s;
        }
        .cm-node:hover .cm-handle,
        .cm-node--selected .cm-handle { opacity: 1; }

        .cm-header {
          display: flex; align-items: center; gap: 7px;
          padding: 10px 12px 8px;
          border-bottom: 1px solid #EDE6D6;
        }
        .cm-icon { font-size: 12px; line-height: 1; }
        .cm-type-label {
          font-size: 10px; font-weight: 600;
          letter-spacing: 0.06em; text-transform: uppercase;
          color: #C89B3C; flex: 1;
        }
        .cm-badge {
          font-size: 10px; font-weight: 700;
          background: #C89B3C; color: #F2EBD9;
          border-radius: 20px; padding: 1px 6px;
        }
        .cm-collapse-btn {
          background: none; border: none; cursor: pointer;
          font-size: 12px; color: #9A8F80; padding: 0;
        }

        .cm-list {
          flex: 1; min-height: 0; overflow-y: auto;
          padding: 8px 12px; display: flex; flex-direction: column; gap: 8px;
        }
        .cm-list::-webkit-scrollbar { width: 3px; }
        .cm-list::-webkit-scrollbar-thumb { background: #C4B9A8; border-radius: 2px; }

        .cm-empty {
          font-size: 12px; color: #B0A090; font-style: italic;
          text-align: center; margin: 8px 0;
          font-family: 'Playfair Display', Georgia, serif;
        }

        .cm-comment {
          display: flex; flex-direction: column; gap: 3px;
          padding: 8px 10px; border-radius: 8px;
          background: #F5EFE3; border: 1px solid #EDE6D6;
          transition: opacity 0.2s;
        }
        .cm-comment--resolved { opacity: 0.45; }

        .cm-comment-header { display: flex; align-items: center; gap: 5px; }
        .cm-author { font-size: 11px; font-weight: 600; color: #1C1A17; flex: 1; }
        .cm-time {
          font-size: 10px; color: #9A8F80;
          font-variant-numeric: tabular-nums;
        }
        .cm-resolve-btn, .cm-delete-btn {
          background: none; border: none; cursor: pointer;
          font-size: 12px; color: #9A8F80; padding: 0; line-height: 1;
          transition: color 0.15s;
        }
        .cm-resolve-btn:hover { color: #5A7A4A; }
        .cm-delete-btn:hover  { color: #C0394B; }

        .cm-text {
          font-size: 12px; line-height: 1.5; color: #1C1A17;
          margin: 0; word-break: break-word;
          font-family: 'Playfair Display', Georgia, serif;
        }

        .cm-input-wrap {
          display: flex; flex-direction: column; gap: 6px;
          padding: 8px 12px 10px;
          border-top: 1px solid #EDE6D6;
        }
        .cm-input {
          width: 100%; font-size: 12px; line-height: 1.5;
          color: #1C1A17; background: #F5EFE3;
          border: 1px solid #EDE6D6; border-radius: 8px;
          outline: none; resize: none; padding: 7px 9px;
          font-family: 'DM Sans', system-ui, sans-serif;
          transition: border-color 0.15s;
        }
        .cm-input:focus { border-color: #C89B3C; }
        .cm-input::placeholder { color: #B0A090; }

        .cm-submit-btn {
          align-self: flex-end;
          font-size: 11px; font-weight: 600;
          color: #F2EBD9; background: #C89B3C;
          border: none; border-radius: 8px;
          padding: 5px 12px; cursor: pointer;
          font-family: 'DM Sans', system-ui, sans-serif;
          transition: background 0.15s;
        }
        .cm-submit-btn:disabled { opacity: 0.4; cursor: default; }
        .cm-submit-btn:not(:disabled):hover { background: #A67C2A; }

        .cm-collapsed-preview { padding: 5px 12px 8px; }
        .cm-collapsed-text {
          font-size: 11px; color: #6B5D50; font-style: italic;
          font-family: 'Playfair Display', Georgia, serif;
        }
      `}</style>
    </div>
  )
}
