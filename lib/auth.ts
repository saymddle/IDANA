// lib/auth.ts
// Used inside API route handlers to get the current user.
// In development with SKIP_AUTH=true, returns a stable dev user.
// In production, verifies the session with Supabase.

import { createSupabaseServerClient } from '@/lib/supabase-server'

export interface AuthUser {
  id: string
  email: string
}

export async function getAuthUser(): Promise<AuthUser | null> {
  // Dev bypass — never runs in production
  if (process.env.SKIP_AUTH === 'true') {
    return { id: 'dev-user-id', email: 'dev@idana.local' }
  }

  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null
    return { id: user.id, email: user.email ?? '' }
  } catch {
    return null
  }
}

// Convenience wrapper — throws a 401 response if not authenticated.
// Use inside API route handlers:
//   const user = await requireAuth()
export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser()
  if (!user) {
    throw new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return user
}
