import { createSupabaseServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

const FIELDS = ['role', 'kitchen', 'location', 'focus', 'bio'] as const

const EMPTY = { role: '', kitchen: '', location: '', focus: '', bio: '' }

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createSupabaseServiceClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('role, kitchen, location, focus, bio')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profile: { ...EMPTY, ...(data ?? {}) } })
}

export async function PATCH(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createSupabaseServiceClient()
  const body = await req.json()

  const updates: Record<string, unknown> = { user_id: userId, updated_at: new Date().toISOString() }
  for (const key of FIELDS) {
    if (key in body) updates[key] = body[key]
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert(updates, { onConflict: 'user_id' })
    .select('role, kitchen, location, focus, bio')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profile: { ...EMPTY, ...(data ?? {}) } })
}
