import { createBrowserClient } from '@supabase/ssr'

// Uses cookies (not localStorage) so the middleware can read the session server-side.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
