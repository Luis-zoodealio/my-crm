import { redirect } from 'next/navigation'
import { asc, eq } from 'drizzle-orm'
import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { savedViews } from '@/lib/db/schema'
import { agentOptions, countDeals, followUpQueue, queryLeads } from '@/lib/leads/query'
import { cleanRules } from '@/lib/leads/spec'
import { parseLeadsParams, RulesSchema, SortsSchema } from '@/lib/leads/params'
import type { ViewSpec } from '@/lib/views'
import { LeadsView } from './LeadsView'

export const metadata = { title: 'Leads · Zoodealio CRM' }

export default async function LeadsPage({ searchParams }: PageProps<'/leads'>) {
  const user = await requireUser()
  const raw = await searchParams

  const rows = await db.select().from(savedViews).where(eq(savedViews.userId, user.id)).orderBy(asc(savedViews.position), asc(savedViews.name))
  // Views are stored as jsonb; skip any that no longer match the spec rather than failing the page.
  const views: ViewSpec[] = rows.flatMap((v) => {
    const rules = RulesSchema.safeParse(v.rules)
    const sorts = SortsSchema.safeParse(v.sorts)
    return rules.success && sorts.success ? [{ name: v.name, rules: cleanRules(rules.data), sorts: sorts.data }] : []
  })

  const params = parseLeadsParams(raw, views)
  const [{ leads, total }, totalDeals, queue, agents] = await Promise.all([
    queryLeads(user.id, user.settings, params.rules, params.sorts, params.page),
    countDeals(user.id),
    followUpQueue(user.id, user.settings),
    agentOptions(user.id),
  ])

  // Page past the end (e.g. after narrowing filters): go back to page 1.
  if (leads.length === 0 && params.page > 1) {
    const p = new URLSearchParams(Object.entries(raw).flatMap(([k, v]) => (typeof v === 'string' && k !== 'page' ? [[k, v] as [string, string]] : [])))
    redirect(`/leads${p.size ? `?${p}` : ''}`)
  }

  return (
    <LeadsView
      leads={leads}
      total={total}
      totalDeals={totalDeals}
      queue={queue}
      agents={agents}
      views={views}
      rules={params.rules}
      sorts={params.sorts}
      activeView={params.view}
      dirty={params.dirty}
      page={params.page}
      staleDays={user.settings.staleDays}
    />
  )
}
