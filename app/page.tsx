import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

export default async function Home() {
  if (process.env.SKIP_AUTH === 'true') redirect('/dashboard')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) redirect('/dashboard')
  else redirect('/login')
}
