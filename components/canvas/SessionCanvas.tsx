'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import CanvasToolbar from './CanvasToolbar'
import CanvasTopBar from './CanvasTopBar'
import ObservationNode from './nodes/ObservationNode'
import PhotoNode from './nodes/PhotoNode'
import IngredientNode from './nodes/IngredientNode'
import VariableNode from './nodes/VariableNode'
import TextureSpectrumNode from './nodes/TextureSpectrumNode'
import TimelineNode from './nodes/TimelineNode'
import VoiceNoteNode from './nodes/VoiceNoteNode'
import ComparisonNode from './nodes/ComparisonNode'
import PairingGraphNode from './nodes/PairingGraphNode'
import CommentNode from './nodes/CommentNode'
import { useCanvasPersistence } from '@/hooks/useCanvasPersistence'
import SaveStatusIndicator from './SaveStatusIndicator'

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

const initialNodes: Node[] = []
const initialEdges: Edge[] = []

interface SessionCanvasProps {
  sessionId: string
  sessionTitle: string
  onTitleChange?: (title: string) => void
  onBack?: () => void
}

function CanvasInner({ sessionId, sessionTitle, onTitleChange, onBack }: SessionCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [minimapVisible, setMinimapVisible] = useState(false)
  const { screenToFlowPosition } = useReactFlow()
  const nodeIdCounter = useRef(1)
  const spawnPairingRef = useRef<((ingredientName: string, sourceNodeId: string) => void) | null>(null)

  const { saveStatus, lastSaved, saveNow, versions, restoreVersion } = useCanvasPersistence({
    sessionId,
    nodes,
    edges,
    enabled: true,
  })

  useEffect(() => {
    if (!sessionId) return
    fetch(`/api/sessions/${sessionId}/objects`)
      .then(r => r.json())
      .then(data => {
        if (data.objects?.length > 0) {
          setNodes(data.objects.map((obj: {
            id: string; type: string;
            position_x: number; position_y: number;
            width?: number; height?: number;
            data: Record<string, unknown>;
          }) => ({
            id: obj.id,
            type: obj.type,
            position: { x: obj.position_x, y: obj.position_y },
            data: obj.data,
            width: obj.width,
            height: obj.height,
          })))
          setEdges(data.edges.map((e: {
            id: string; source_id: string; target_id: string; edge_type: string;
          }) => ({
            id: e.id,
            source: e.source_id,
            target: e.target_id,
            type: e.edge_type ?? 'smoothstep',
          })))
        }
      })
      .catch(err => console.error('Failed to load canvas:', err))
  }, [sessionId, setNodes, setEdges])

  const handleRestoreVersion = useCallback(async (versionId: string) => {
    await restoreVersion(versionId)
    const res = await fetch(`/api/sessions/${sessionId}/objects`)
    const data = await res.json()
    if (data.objects) {
      setNodes(data.objects.map((obj: {
        id: string; type: string;
        position_x: number; position_y: number;
        data: Record<string, unknown>;
      }) => ({
        id: obj.id, type: obj.type,
        position: { x: obj.position_x, y: obj.position_y },
        data: obj.data,
      })))
      setEdges(data.edges.map((e: {
        id: string; source_id: string; target_id: string; edge_type: string;
      }) => ({
        id: e.id, source: e.source_id, target: e.target_id, type: e.edge_type,
      })))
    }
  }, [restoreVersion, sessionId, setNodes, setEdges])

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  )

  const spawnNode = useCallback(
    (type: string) => {
      const id = `node-${nodeIdCounter.current++}`
      const center = screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      })

      const defaultData: Record<string, unknown> = {
        observation: {
          label: 'New observation',
          text: '',
          category: 'general',
          tags: [],
          timestamp: new Date().toISOString(),
        },
        photo: {
          label: 'Photo',
          src: null,
          caption: '',
          timestamp: new Date().toISOString(),
        },
        ingredient: {
          label: 'Ingredient',
          name: '',
          source: '',
          prepState: '',
          freshness: '',
          substitutions: '',
          notes: '',
          onExplorePairings: (ingName: string, nodeId: string) => {
            spawnPairingRef.current?.(ingName, nodeId)
          },
        },
        variable: {
          label: 'Variable',
          variableType: 'temperature',
          value: '',
          unit: '',
          result: '',
        },
        pairing: {
          label: 'Flavor Pairing',
          ingredient: '',
        },
        comment: {
          label: 'Comment',
          comments: [],
          sessionId,
        },
        texture: {
          label: 'Texture Spectrum',
          spectrums: [],
        },
        voice: {
          label: 'Voice Note',
          audioUrl: null,
          duration: 0,
        },
        timeline: {
          label: 'Timeline',
          events: [],
        },
        comparison: {
          label: 'Comparison',
          versions: [],
        },
      }

      const newNode: Node = {
        id,
        type,
        position: {
          x: center.x - 140,
          y: center.y - 80,
        },
        data: (defaultData[type] ?? { label: type }) as Record<string, unknown>,
      }

      setNodes((nds) => [...nds, newNode])
    },
    [screenToFlowPosition, setNodes]
  )

  const spawnPairingNode = useCallback(
    (ingredientName: string, sourceNodeId: string) => {
      const id = `node-${nodeIdCounter.current++}`
      const sourceNode = nodes.find(n => n.id === sourceNodeId)
      const position = {
        x: sourceNode ? sourceNode.position.x + 320 : window.innerWidth / 2 - 210,
        y: sourceNode ? sourceNode.position.y : window.innerHeight / 2 - 80,
      }
      setNodes(nds => [...nds, {
        id,
        type: 'pairing',
        position,
        data: { ingredientName, label: `${ingredientName} pairings` },
      }])
      setEdges(eds => [...eds, {
        id: `edge-${sourceNodeId}-${id}`,
        source: sourceNodeId,
        target: id,
        type: 'smoothstep',
        style: { stroke: '#C0394B', strokeWidth: 1.5, opacity: 0.5, strokeDasharray: '4 3' },
      }])
    },
    [nodes, setNodes, setEdges]
  )
  spawnPairingRef.current = spawnPairingNode

  return (
    <div className="idana-canvas-root">
      <CanvasTopBar
        title={sessionTitle}
        onTitleChange={onTitleChange}
        onBack={onBack}
        onToggleMinimap={() => setMinimapVisible((v) => !v)}
        minimapVisible={minimapVisible}
        nodeCount={nodes.length}
        saveIndicator={
          <SaveStatusIndicator
            status={saveStatus}
            lastSaved={lastSaved}
            versions={versions}
            onRestoreVersion={handleRestoreVersion}
            onSaveNow={saveNow}
          />
        }
      />

      <div className="idana-canvas-flow">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.15}
          maxZoom={2.5}
          defaultEdgeOptions={{
            style: { stroke: 'var(--idana-clay)', strokeWidth: 1.5, opacity: 0.6 },
            type: 'smoothstep',
          }}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1.5}
            color="var(--idana-dot)"
          />

          <Controls
            className="idana-controls"
            showInteractive={false}
          />

          {minimapVisible && (
            <MiniMap
              className="idana-minimap"
              nodeColor="var(--idana-clay)"
              maskColor="rgba(242, 235, 217, 0.7)"
              style={{
                background: 'var(--idana-cream)',
                border: '1px solid var(--idana-ash)',
                borderRadius: '10px',
              }}
            />
          )}
        </ReactFlow>
      </div>

      <CanvasToolbar onSpawn={spawnNode} />

      <style>{`
        .idana-canvas-root {
          position: fixed;
          inset: 0;
          display: flex;
          flex-direction: column;
          background: var(--idana-canvas-bg, #F5EFE3);
          font-family: var(--idana-font-body, 'DM Sans', system-ui, sans-serif);
        }

        .idana-canvas-flow {
          flex: 1;
          position: relative;
          overflow: hidden;
        }

        .idana-canvas-flow .react-flow__renderer {
          background: transparent;
        }

        .idana-canvas-flow .react-flow__edge-path {
          stroke: var(--idana-clay, #8B5E3C);
          stroke-width: 1.5;
          opacity: 0.5;
        }

        .idana-canvas-flow .react-flow__handle {
          width: 8px;
          height: 8px;
          background: var(--idana-clay, #8B5E3C);
          border: 2px solid var(--idana-cream, #F2EBD9);
          opacity: 0;
          transition: opacity 0.2s;
        }

        .idana-canvas-flow .react-flow__node:hover .react-flow__handle {
          opacity: 1;
        }

        .idana-controls {
          background: var(--idana-cream, #F2EBD9) !important;
          border: 1px solid var(--idana-ash, #C4B9A8) !important;
          border-radius: 10px !important;
          overflow: hidden;
        }

        .idana-controls button {
          background: transparent !important;
          border-color: var(--idana-ash, #C4B9A8) !important;
          color: var(--idana-charcoal, #1C1A17) !important;
        }

        .idana-controls button:hover {
          background: var(--idana-ash, #C4B9A8) !important;
        }

        .idana-minimap {
          bottom: 96px !important;
          right: 16px !important;
        }
      `}</style>
    </div>
  )
}

export default function SessionCanvas(props: SessionCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  )
}
