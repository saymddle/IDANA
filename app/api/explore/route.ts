import { createSupabaseServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { searchParams } = new URL(req.url)
  const tag = searchParams.get('tag')
  const q = searchParams.get('q')

  let query = supabase
    .from('sessions')
    .select('id, title, goal, tags, cover_photo, created_at, updated_at')
    .eq('published', true)
    .order('updated_at', { ascending: false })

  if (tag) {
    query = query.contains('tags', [tag])
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let sessions = data ?? []

  if (q) {
    const lower = q.toLowerCase()
    sessions = sessions.filter((s: { title: string; goal?: string; tags?: string[] }) =>
      s.title.toLowerCase().includes(lower) ||
      s.goal?.toLowerCase().includes(lower) ||
      (s.tags ?? []).some((t: string) => t.toLowerCase().includes(lower))
    )
  }

  return NextResponse.json({ sessions })
}
