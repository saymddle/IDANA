// lib/supabase-server.ts
// SSR-aware Supabase client — reads/writes cookies for session persistence.
// Used by middleware.ts and server-side API routes ONLY.
// Your existing lib/supabase.ts (browser client) is untouched.

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createSupabaseServerClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll called from a Server Component — safe to ignore,
            // middleware will handle session refresh
          }
        },
      },
    }
  )
}

// Service-role client — bypasses RLS. Use only in trusted server contexts.
// Requires SUPABASE_SERVICE_ROLE_KEY in .env.local (never expose to browser).
export function createSupabaseServiceClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
