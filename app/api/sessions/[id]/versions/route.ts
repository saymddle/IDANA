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

  const { data, error } = await supabase
    .from('canvas_versions')
    .select('id, created_at, node_count, label')
    .eq('session_id', id)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ versions: data ?? [] })
}
