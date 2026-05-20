'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
  ReactFlowProvider,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import ObservationNode from '@/components/canvas/nodes/ObservationNode'
import PhotoNode from '@/components/canvas/nodes/PhotoNode'
import IngredientNode from '@/components/canvas/nodes/IngredientNode'
import VariableNode from '@/components/canvas/nodes/VariableNode'
import TextureSpectrumNode from '@/components/canvas/nodes/TextureSpectrumNode'
import TimelineNode from '@/components/canvas/nodes/TimelineNode'
import VoiceNoteNode from '@/components/canvas/nodes/VoiceNoteNode'
import ComparisonNode from '@/components/canvas/nodes/ComparisonNode'
import PairingGraphNode from '@/components/canvas/nodes/PairingGraphNode'
import CommentNode from '@/components/canvas/nodes/CommentNode'
import ForkSessionButton from '@/components/ForkSessionButton'

const nodeTypes: NodeTypes = {
  observation: ObservationNode,
  photo: PhotoNode,
  ingredient: IngredientNode,
  variable: VariableNode,
  texture: TextureSpectrumNode,
  timeline: TimelineNode,
  voice: VoiceNoteNode,
  comparison: ComparisonNode,
  pairing: PairingGraphNode,
  comment: CommentNode,
}

interface SessionMeta {
  title: string
  goal?: string
  tags?: string[]
}

function ExploreViewer({ sessionId }: { sessionId: string }) {
  const router = useRouter()
  const [meta, setMeta] = useState<SessionMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/explore/${sessionId}`)
      if (!res.ok) { setNotFound(true); setLoading(false); return }
      const json = await res.json()
      setMeta({ title: json.session.title, goal: json.session.goal, tags: json.session.tags })

      const flowNodes: Node[] = (json.objects ?? []).map((obj: Record<string, unknown>) => ({
        id: obj.id as string,
        type: obj.type as string,
        position: { x: obj.position_x as number, y: obj.position_y as number },
        data: (obj.data as Record<string, unknown>) ?? {},
      }))

      const flowEdges: Edge[] = (json.edges ?? []).map((e: Record<string, unknown>) => ({
        id: e.id as string,
        source: e.source_id as string,
        target: e.target_id as string,
        type: (e.edge_type as string) ?? 'smoothstep',
      }))

      setNodes(flowNodes)
      setEdges(flowEdges)
      setLoading(false)
    }
    load()
  }, [sessionId, setNodes, setEdges])

  if (loading) {
    return (
      <div className="ev-loading">
        <p>Loading session...</p>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="ev-loading">
        <p>Session not found or not published.</p>
        <button className="ev-back-btn" onClick={() => router.push('/explore')}>
          ← Back to Explore
        </button>
      </div>
    )
  }

  return (
    <div className="ev-root">
      <div className="ev-topbar">
        <button className="ev-back-btn" onClick={() => router.push('/explore')}>
          ← Explore
        </button>
        <div className="ev-meta">
          <h1 className="ev-title">{meta?.title}</h1>
          {meta?.goal && <p className="ev-goal">{meta.goal}</p>}
        </div>
        {(meta?.tags ?? []).length > 0 && (
          <div className="ev-tags">
            {(meta?.tags ?? []).map(tag => (
              <span key={tag} className="ev-tag">{tag}</span>
            ))}
          </div>
        )}
        <ForkSessionButton
          sessionId={sessionId}
          sessionTitle={meta?.title ?? 'Session'}
        />
        <span className="ev-readonly-badge">Read-only</span>
      </div>

      <div className="ev-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{
            style: { stroke: '#8B5E3C', strokeWidth: 1.5, opacity: 0.6 },
            type: 'smoothstep',
          }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24} size={1.5}
            color="rgba(139,94,60,0.15)"
          />
          <Controls showInteractive={false} className="ev-controls" />
        </ReactFlow>
      </div>

      <style>{`
        .ev-root {
          position: fixed; inset: 0;
          display: flex; flex-direction: column;
          background: #F5EFE3;
          font-family: 'DM Sans', system-ui, sans-serif;
        }
        .ev-topbar {
          height: 56px; flex-shrink: 0;
          display: flex; align-items: center; gap: 12px;
          padding: 0 16px;
          background: #FDFAF4;
          border-bottom: 1px solid #C4B9A8;
          overflow: hidden;
        }
        .ev-back-btn {
          font-size: 13px; font-weight: 500;
          color: #8B5E3C; background: none; border: none;
          cursor: pointer; white-space: nowrap; padding: 0;
          font-family: 'DM Sans', system-ui, sans-serif;
          flex-shrink: 0;
        }
        .ev-back-btn:hover { color: #6E4A2A; }
        .ev-meta { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; }
        .ev-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 16px; font-weight: 600; color: #1C1A17; margin: 0;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .ev-goal {
          font-size: 11px; color: #9A8F80; margin: 0;
          font-style: italic;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .ev-tags { display: flex; gap: 4px; flex-shrink: 0; }
        .ev-tag {
          font-size: 10px; font-weight: 500;
          background: rgba(139,94,60,0.08); color: #8B5E3C;
          border-radius: 20px; padding: 2px 7px;
        }
        .ev-readonly-badge {
          font-size: 10px; font-weight: 600;
          letter-spacing: 0.05em; text-transform: uppercase;
          color: #9A8F80; background: rgba(0,0,0,0.05);
          border-radius: 20px; padding: 3px 8px;
          flex-shrink: 0;
        }
        .ev-canvas { flex: 1; position: relative; overflow: hidden; }
        .ev-loading {
          position: fixed; inset: 0;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 16px;
          background: #F5EFE3;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 14px; color: #9A8F80;
        }
        .ev-controls {
          background: #FDFAF4 !important;
          border: 1px solid #C4B9A8 !important;
          border-radius: 10px !important;
          overflow: hidden;
        }
        .ev-controls button {
          background: transparent !important;
          border-color: #C4B9A8 !important;
          color: #1C1A17 !important;
        }
        .ev-controls button:hover { background: #C4B9A8 !important; }
      `}</style>
    </div>
  )
}

export default function ExploreSessionPage() {
  const params = useParams()
  const id = params.id as string
  return (
    <ReactFlowProvider>
      <ExploreViewer sessionId={id} />
    </ReactFlowProvider>
  )
}
