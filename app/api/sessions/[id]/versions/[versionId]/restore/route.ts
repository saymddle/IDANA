import { createSupabaseServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, versionId } = await params
  const supabase = await createSupabaseServiceClient()

  const { data: version, error: vErr } = await supabase
    .from('canvas_versions')
    .select('snapshot')
    .eq('id', versionId)
    .eq('session_id', id)
    .single()

  if (vErr || !version) {
    return NextResponse.json({ error: 'Version not found' }, { status: 404 })
  }

  const snapshot = version.snapshot as {
    nodes: Array<{
      id: string; type: string;
      position_x: number; position_y: number;
      width?: number; height?: number;
      data: Record<string, unknown>;
    }>
    edges: Array<{
      id: string; source_id: string; target_id: string; edge_type: string;
    }>
  }

  await Promise.all([
    supabase.from('canvas_edges').delete().eq('session_id', id),
    supabase.from('canvas_objects').delete().eq('session_id', id),
  ])

  if (snapshot.nodes?.length > 0) {
    await supabase.from('canvas_objects').insert(
      snapshot.nodes.map(n => ({
        id: n.id,
        session_id: id,
        type: n.type,
        position_x: n.position_x,
        position_y: n.position_y,
        width: n.width,
        height: n.height,
        data: n.data,
      }))
    )
  }

  if (snapshot.edges?.length > 0) {
    await supabase.from('canvas_edges').insert(
      snapshot.edges.map(e => ({
        id: e.id,
        session_id: id,
        source_id: e.source_id,
        target_id: e.target_id,
        edge_type: e.edge_type,
      }))
    )
  }

  await supabase
    .from('sessions')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', id)

  return NextResponse.json({ success: true })
}
