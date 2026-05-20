import { createSupabaseServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()

  const { data: session, error } = await supabase
    .from('sessions')
    .select('id, title, goal, tags, cover_photo, created_at, updated_at')
    .eq('id', id)
    .eq('published', true)
    .single()

  if (error || !session) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const [{ data: objects }, { data: edges }] = await Promise.all([
    supabase.from('canvas_objects').select('*').eq('session_id', id).order('created_at'),
    supabase.from('canvas_edges').select('*').eq('session_id', id),
  ])

  return NextResponse.json({ session, objects: objects ?? [], edges: edges ?? [] })
}
