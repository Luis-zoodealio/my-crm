import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { AGENTS_PAGE, listAgents } from '@/lib/agents/query'
import { AgentsView } from './AgentsView'

export const metadata = { title: 'Agents · Zoodealio CRM' }

export default async function AgentsPage({ searchParams }: PageProps<'/agents'>) {
  const user = await requireUser()
  const raw = await searchParams
  const q = (typeof raw.q === 'string' ? raw.q : '').slice(0, 100)
  const page = Math.max(1, Math.min(100000, Number.parseInt(typeof raw.page === 'string' ? raw.page : '1', 10) || 1))

  const { agents, total } = await listAgents(user.id, q, page)
  // A page past the end (e.g. after the search narrowed): back to page 1.
  if (agents.length === 0 && page > 1) redirect(q ? `/agents?q=${encodeURIComponent(q)}` : '/agents')

  return <AgentsView agents={agents} total={total} q={q} page={page} pageSize={AGENTS_PAGE} />
}
