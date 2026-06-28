import { createSupabaseServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = await createSupabaseServiceClient()

  const [{ data: objects, error: objErr }, { data: edges, error: edgeErr }] = await Promise.all([
    supabase.from('canvas_objects').select('*').eq('session_id', id).order('created_at'),
    supabase.from('canvas_edges').select('*').eq('session_id', id),
  ])

  if (objErr) return NextResponse.json({ error: objErr.message }, { status: 500 })
  if (edgeErr) return NextResponse.json({ error: edgeErr.message }, { status: 500 })

  return NextResponse.json({ objects: objects ?? [], edges: edges ?? [] })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = await createSupabaseServiceClient()
  const { nodes, edges } = await req.json()

  await Promise.all([
    supabase.from('canvas_edges').delete().eq('session_id', id),
    supabase.from('canvas_objects').delete().eq('session_id', id),
  ])

  if (nodes?.length > 0) {
    const { error: nodesErr } = await supabase.from('canvas_objects').insert(
      nodes.map((n: {
        id: string; type: string;
        position: { x: number; y: number };
        width?: number; height?: number;
        data: Record<string, unknown>;
      }) => ({
        id: n.id,
        session_id: id,
        type: n.type,
        position_x: n.position.x,
        position_y: n.position.y,
        width: n.width ?? null,
        height: n.height ?? null,
        data: n.data,
        collapsed: (n.data as Record<string, unknown>).collapsed ?? false,
      }))
    )
    if (nodesErr) return NextResponse.json({ error: nodesErr.message }, { status: 500 })
  }

  if (edges?.length > 0) {
    const { error: edgesErr } = await supabase.from('canvas_edges').insert(
      edges.map((e: { id: string; source: string; target: string; type?: string }) => ({
        id: e.id,
        session_id: id,
        source_id: e.source,
        target_id: e.target,
        edge_type: e.type ?? 'smoothstep',
      }))
    )
    if (edgesErr) return NextResponse.json({ error: edgesErr.message }, { status: 500 })
  }

  const snapshot = {
    nodes: (nodes ?? []).map((n: {
      id: string; type: string;
      position: { x: number; y: number };
      width?: number; height?: number;
      data: Record<string, unknown>;
    }) => ({
      id: n.id,
      type: n.type,
      position_x: n.position.x,
      position_y: n.position.y,
      width: n.width,
      height: n.height,
      data: n.data,
    })),
    edges: (edges ?? []).map((e: { id: string; source: string; target: string; type?: string }) => ({
      id: e.id,
      source_id: e.source,
      target_id: e.target,
      edge_type: e.type ?? 'smoothstep',
    })),
  }

  await supabase.from('canvas_versions').insert({
    session_id: id,
    snapshot,
    node_count: (nodes ?? []).length,
    label: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  })

  const { data: allVersions } = await supabase
    .from('canvas_versions')
    .select('id, created_at')
    .eq('session_id', id)
    .order('created_at', { ascending: false })

  if (allVersions && allVersions.length > 10) {
    const toDelete = allVersions.slice(10).map((v: { id: string }) => v.id)
    await supabase.from('canvas_versions').delete().in('id', toDelete)
  }

  await supabase
    .from('sessions')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', id)

  return NextResponse.json({ success: true })
}
