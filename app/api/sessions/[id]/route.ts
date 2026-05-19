import { createSupabaseServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createSupabaseServerClient()

  const { data: session, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  const [{ data: objects }, { data: edges }] = await Promise.all([
    supabase.from('canvas_objects').select('*').eq('session_id', id).order('created_at'),
    supabase.from('canvas_edges').select('*').eq('session_id', id),
  ])

  return NextResponse.json({ session, objects: objects ?? [], edges: edges ?? [] })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createSupabaseServerClient()
  const body = await req.json()

  const allowed = ['title', 'goal', 'tags', 'published', 'cover_photo']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }
  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('sessions')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ session: data })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createSupabaseServerClient()

  await Promise.all([
    supabase.from('canvas_objects').delete().eq('session_id', id),
    supabase.from('canvas_edges').delete().eq('session_id', id),
  ])

  const { error } = await supabase.from('sessions').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
