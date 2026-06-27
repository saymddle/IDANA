import { createSupabaseServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createSupabaseServiceClient()

  const { data, error } = await supabase
    .from('sessions')
    .select('id, title, goal, tags, cover_photo, published, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const sessionIds = (data ?? []).map((s: { id: string }) => s.id)
  let counts: Record<string, number> = {}

  if (sessionIds.length > 0) {
    const { data: objData } = await supabase
      .from('canvas_objects')
      .select('session_id')
      .in('session_id', sessionIds)

    counts = (objData ?? []).reduce((acc: Record<string, number>, row: { session_id: string }) => {
      acc[row.session_id] = (acc[row.session_id] ?? 0) + 1
      return acc
    }, {})
  }

  const sessions = (data ?? []).map((s: {
    id: string; title: string; goal?: string; tags?: string[];
    cover_photo?: string | null; published: boolean;
    created_at: string; updated_at: string;
  }) => ({ ...s, node_count: counts[s.id] ?? 0 }))

  return NextResponse.json({ sessions })
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createSupabaseServiceClient()
  const body = await req.json()
  const { title, goal, tags } = body

  const { data, error } = await supabase
    .from('sessions')
    .insert({ title: title || 'Untitled Session', goal, tags: tags ?? [], published: false, user_id: userId })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ session: data }, { status: 201 })
}
