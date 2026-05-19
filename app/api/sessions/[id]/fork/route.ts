import { createSupabaseServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createSupabaseServerClient()
  const body = await req.json().catch(() => ({}))

  const { data: source, error: srcErr } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', id)
    .eq('published', true)
    .single()

  if (srcErr || !source) {
    return NextResponse.json({ error: 'Session not found or not published' }, { status: 404 })
  }

  const { data: forked, error: forkErr } = await supabase
    .from('sessions')
    .insert({
      title: body.title ?? `${source.title} (fork)`,
      goal: source.goal,
      tags: source.tags,
      published: false,
      forked_from: source.id,
    })
    .select()
    .single()

  if (forkErr || !forked) {
    return NextResponse.json({ error: forkErr?.message }, { status: 500 })
  }

  const [{ data: objects }, { data: edges }] = await Promise.all([
    supabase.from('canvas_objects').select('*').eq('session_id', id),
    supabase.from('canvas_edges').select('*').eq('session_id', id),
  ])

  const idMap: Record<string, string> = {}

  if (objects && objects.length > 0) {
    const newObjects = objects.map((obj: Record<string, unknown>) => {
      const newId = crypto.randomUUID()
      idMap[obj.id as string] = newId
      const { id: _id, created_at: _c, updated_at: _u, session_id: _s, ...rest } = obj
      return { ...rest, id: newId, session_id: forked.id }
    })
    await supabase.from('canvas_objects').insert(newObjects)
  }

  if (edges && edges.length > 0) {
    const remapped = edges
      .filter((e: Record<string, unknown>) => idMap[e.source_id as string] && idMap[e.target_id as string])
      .map((e: Record<string, unknown>) => {
        const { id: _id, created_at: _c, session_id: _s, ...rest } = e
        return {
          ...rest,
          id: crypto.randomUUID(),
          session_id: forked.id,
          source_id: idMap[e.source_id as string],
          target_id: idMap[e.target_id as string],
        }
      })
    if (remapped.length > 0) {
      await supabase.from('canvas_edges').insert(remapped)
    }
  }

  return NextResponse.json({ session: forked }, { status: 201 })
}
