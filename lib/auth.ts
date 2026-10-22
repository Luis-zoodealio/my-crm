import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { ensureUserSetup, type UserSettings } from '@/lib/bootstrap'

export type SessionUser = { id: string; email: string; settings: UserSettings }

/**
 * The signed-in user. proxy.ts already validated and refreshed the session with Supabase Auth
 * on this request; here we verify the token's signature (getClaims) instead of trusting the
 * cookie, without a second network round trip.
 */
export const requireUser = cache(async (): Promise<SessionUser> => {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (!claims?.sub) redirect('/login')
  const settings = await ensureUserSetup(claims.sub)
  return { id: claims.sub, email: typeof claims.email === 'string' ? claims.email : '', settings }
})
