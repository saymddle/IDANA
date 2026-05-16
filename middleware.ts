// middleware.ts  (project root — same level as package.json)
// Runs on every request. Refreshes the Supabase session cookie and
// redirects unauthenticated users to /auth.

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that never require auth
const PUBLIC_PATHS = ['/auth']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // — Dev bypass ————————————————————————————————————————————————————————————
  // Add SKIP_AUTH=true to .env.local to skip auth entirely during development.
  // This variable is never set in production (Vercel env vars), so it's safe.
  if (process.env.SKIP_AUTH === 'true') {
    return NextResponse.next()
  }

  // — Always allow public paths —————————————————————————————————————————————
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // — Session refresh + auth check ——————————————————————————————————————————
  // We must create a response first so the SSR client can mutate cookies on it
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Write cookies to both the request (for this middleware pass)
          // and the response (so the browser receives them)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() validates the session JWT with Supabase — do not use getSession()
  // here as it only reads from cookie without server verification
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Preserve the intended destination so we can redirect back after login
    const loginUrl = new URL('/auth', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    // Run on all paths except Next.js internals and static assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
