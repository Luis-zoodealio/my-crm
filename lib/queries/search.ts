import 'server-only'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

export type DealResult = {
  id: string
  address: string
  city: string | null
  state: string | null
  zip: string | null
  leadStatus: string
  stage: number
  agentName: string | null
}

export type AgentResult = {
  id: string
  name: string
  agency: string | null
  dealCount: number
}

export type SearchResults = { deals: DealResult[]; agents: AgentResult[] }

const LIMIT = 15
type Raw = Record<string, unknown>

export async function search(userId: string, q: string): Promise<SearchResults> {
  const term = q.trim().slice(0, 100)
  if (!term) return { deals: [], agents: [] }
  const like = `%${term.replace(/[\\%_]/g, (c) => '\\' + c)}%`

  const [dealRows, agentRows] = await Promise.all([
    db.execute(sql`
      select d.id, d.address, d.city, d.state, d.zip, d.lead_status, d.stage, a.name as agent_name
        from crm.deals d
        left join crm.agents a on a.id = d.agent_id
       where d.user_id = ${userId}
         and concat_ws(' ', d.address, d.city, d.state, d.zip) ilike ${like}
       order by d.address
       limit ${LIMIT}`),
    db.execute(sql`
      select a.id, a.name, a.agency, count(d.id)::int as deal_count
        from crm.agents a
        left join crm.deals d on d.agent_id = a.id and d.user_id = a.user_id
       where a.user_id = ${userId}
         and (a.name ilike ${like} or a.agency ilike ${like})
       group by a.id
       order by a.name
       limit ${LIMIT}`),
  ])

  return {
    deals: ([...dealRows] as Raw[]).map((r) => ({
      id: r.id as string,
      address: r.address as string,
      city: r.city as string | null,
      state: r.state as string | null,
      zip: r.zip as string | null,
      leadStatus: r.lead_status as string,
      stage: Number(r.stage),
      agentName: r.agent_name as string | null,
    })),
    agents: ([...agentRows] as Raw[]).map((r) => ({
      id: r.id as string,
      name: r.name as string,
      agency: r.agency as string | null,
      dealCount: Number(r.deal_count),
    })),
  }
}
