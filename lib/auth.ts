import { auth } from '@clerk/nextjs/server'

export interface AuthUser {
  id: string
}

export async function getAuthUser(): Promise<AuthUser | null> {
  if (process.env.SKIP_AUTH === 'true') {
    return { id: 'dev-user-id' }
  }
  const { userId } = await auth()
  if (!userId) return null
  return { id: userId }
}

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
