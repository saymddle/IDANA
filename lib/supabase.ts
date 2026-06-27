import { createClient } from '@supabase/supabase-js'

// Browser client — used in client components for public/read-only queries.
// Auth is handled by Clerk; all user-scoped data goes through API routes.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
