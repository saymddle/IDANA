import { createSupabaseServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()

  const { data: original, error: sessionErr } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', id)
    .single()

  if (sessionErr || !original) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const { data: newSession, error: createErr } = await supabase
    .from('sessions')
    .insert({
      title: `${original.title} (copy)`,
      goal: original.goal,
      tags: original.tags,
      published: false,
    })
    .select()
    .single()

  if (createErr || !newSession) {
    return NextResponse.json({ error: createErr?.message }, { status: 500 })
  }

  const [{ data: objects }, { data: edges }] = await Promise.all([
    supabase.from('canvas_objects').select('*').eq('session_id', id),
    supabase.from('canvas_edges').select('*').eq('session_id', id),
  ])

  if (objects && objects.length > 0) {
    const idMap: Record<string, string> = {}
    const newObjects = objects.map((obj: Record<string, unknown>) => {
      const newId = crypto.randomUUID()
      idMap[obj.id as string] = newId
      const { id: _id, created_at: _c, updated_at: _u, ...rest } = obj
      return { ...rest, id: newId, session_id: newSession.id }
    })
    await supabase.from('canvas_objects').insert(newObjects)

    if (edges && edges.length > 0) {
      const newEdges = edges.map((edge: Record<string, unknown>) => {
        const { id: _id, created_at: _c, ...rest } = edge
        return {
          ...rest,
          id: crypto.randomUUID(),
          session_id: newSession.id,
          source_id: idMap[edge.source_id as string] ?? edge.source_id,
          target_id: idMap[edge.target_id as string] ?? edge.target_id,
        }
      })
      await supabase.from('canvas_edges').insert(newEdges)
    }
  }

  return NextResponse.json({ session: newSession }, { status: 201 })
}
