import 'server-only'
import { sql, type SQL } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { fullAddress } from '@/lib/format'

export const AGENTS_PAGE = 24
export const AGENT_DEALS_PAGE = 25

type Raw = Record<string, unknown>

export type AgentCard = {
  id: string
  name: string
  agency: string | null
  dealCount: number
  totalOffers: number
  /** Deals whose address matched the search (only when searching), max 3. */
  matches: string[]
}

const likeOf = (q: string) => `%${q.replace(/[\\%_]/g, (c) => '\\' + c)}%`

/** Agents with deal counts and total Cash offers. Search matches name, agency, or any of the agent's property addresses. */
export async function listAgents(userId: string, q: string, page: number): Promise<{ agents: AgentCard[]; total: number }> {
  const term = q.trim().slice(0, 100)
  const like = likeOf(term)
  const search: SQL = term
    ? sql`and (a.name ilike ${like} or a.agency ilike ${like}
             or exists (select 1 from crm.deals x
                         where x.agent_id = a.id and x.user_id = a.user_id
                           and concat_ws(' ', x.address, x.city, x.state, x.zip) ilike ${like}))`
    : sql``

  const rows = [
    ...(await db.execute(sql`
      select a.id, a.name, a.agency, count(d.id)::int as deal_count,
             coalesce(sum(d.cash_offer), 0)::float8 as total_offers,
             count(*) over () as total
        from crm.agents a
        left join crm.deals d on d.agent_id = a.id and d.user_id = a.user_id
       where a.user_id = ${userId} ${search}
       group by a.id
       order by lower(a.name), a.id
       limit ${AGENTS_PAGE} offset ${(page - 1) * AGENTS_PAGE}`)),
  ] as Raw[]

  const matches = new Map<string, string[]>()
  if (term && rows.length) {
    const ids = sql.join(rows.map((r) => sql`${r.id as string}::uuid`), sql`, `)
    const m = [
      ...(await db.execute(sql`
        select agent_id, address, city, state, zip from (
          select d.agent_id, d.address, d.city, d.state, d.zip,
                 row_number() over (partition by d.agent_id order by lower(d.address)) as rn
            from crm.deals d
           where d.user_id = ${userId} and d.agent_id in (${ids})
             and concat_ws(' ', d.address, d.city, d.state, d.zip) ilike ${like}
        ) x where rn <= 3
        order by agent_id, rn`)),
    ] as Raw[]
    for (const r of m) {
      const list = matches.get(r.agent_id as string) ?? []
      list.push([r.address, r.city, [r.state, r.zip].filter(Boolean).join(' ')].filter(Boolean).join(', '))
      matches.set(r.agent_id as string, list)
    }
  }

  return {
    total: rows.length ? Number(rows[0].total) : 0,
    agents: rows.map((r) => ({
      id: r.id as string,
      name: r.name as string,
      agency: r.agency as string | null,
      dealCount: Number(r.deal_count),
      totalOffers: Number(r.total_offers),
      matches: matches.get(r.id as string) ?? [],
    })),
  }
}

export type AgentProfile = {
  id: string
  name: string
  agency: string | null
  phone: string | null
  email: string | null
  dealCount: number
  totalOffers: number
  lastContactAt: string | null
}

export async function getAgent(userId: string, id: string): Promise<AgentProfile | null> {
  if (!z.uuid().safeParse(id).success) return null
  const [r] = [
    ...(await db.execute(sql`
      select a.id, a.name, a.agency, a.phone, a.email,
             count(d.id)::int as deal_count, coalesce(sum(d.cash_offer), 0)::float8 as total_offers,
             (select max(n.created_at)
                from crm.notes n
                join crm.deals d2 on d2.id = n.deal_id and d2.user_id = a.user_id
               where d2.agent_id = a.id) as last_contact_at
        from crm.agents a
        left join crm.deals d on d.agent_id = a.id and d.user_id = a.user_id
       where a.id = ${id} and a.user_id = ${userId}
       group by a.id`)),
  ] as Raw[]
  if (!r) return null
  return {
    id: r.id as string,
    name: r.name as string,
    agency: r.agency as string | null,
    phone: r.phone as string | null,
    email: r.email as string | null,
    dealCount: Number(r.deal_count),
    totalOffers: Number(r.total_offers),
    lastContactAt: r.last_contact_at ? String(r.last_contact_at) : null,
  }
}

export type AgentTask = {
  id: string
  title: string
  description: string | null
  method: string
  source: string
  days: number
  dueDate: string
  dueTime: string
  dealId: string
  dealLabel: string
}

export async function getAgentOpenTasks(userId: string, agentId: string, tz: string): Promise<AgentTask[]> {
  const rows = [
    ...(await db.execute(sql`
      select t.id, t.title, t.description, t.method, t.source,
             ((t.due_at at time zone ${tz})::date - (now() at time zone ${tz})::date)::int as days,
             to_char(t.due_at at time zone ${tz}, 'YYYY-MM-DD') as due_date,
             to_char(t.due_at at time zone ${tz}, 'HH24:MI') as due_time,
             d.id as deal_id, d.address, d.city, d.state, d.zip
        from crm.tasks t
        join crm.deals d on d.id = t.deal_id and d.user_id = t.user_id
       where d.agent_id = ${agentId} and t.user_id = ${userId} and not t.done
       order by t.due_at asc`)),
  ] as Raw[]
  return rows.map((r) => ({
    id: r.id as string,
    title: r.title as string,
    description: r.description as string | null,
    method: r.method as string,
    source: r.source as string,
    days: Number(r.days),
    dueDate: r.due_date as string,
    dueTime: r.due_time as string,
    dealId: r.deal_id as string,
    dealLabel: fullAddress({ address: r.address as string, city: r.city as string | null, state: r.state as string | null, zip: r.zip as string | null }),
  }))
}

export type AgentDeal = {
  id: string
  address: string
  city: string | null
  state: string | null
  zip: string | null
  stage: number
  leadStatus: string
  cashOffer: number | null
  cashPlusOffer: number | null
}

export async function getAgentDeals(userId: string, agentId: string, page: number): Promise<AgentDeal[]> {
  const rows = [
    ...(await db.execute(sql`
      select d.id, d.address, d.city, d.state, d.zip, d.stage, d.lead_status,
             d.cash_offer::float8 as cash_offer, d.cash_plus_offer::float8 as cash_plus_offer
        from crm.deals d
       where d.user_id = ${userId} and d.agent_id = ${agentId}
       order by case when d.stage <= 7 then 0 else 1 end,
                case d.lead_status when 'Hot' then 0 when 'Warm' then 1 when 'Cold' then 2 else 3 end,
                d.last_contact_at asc, d.id
       limit ${AGENT_DEALS_PAGE} offset ${(page - 1) * AGENT_DEALS_PAGE}`)),
  ] as Raw[]
  return rows.map((r) => ({
    id: r.id as string,
    address: r.address as string,
    city: r.city as string | null,
    state: r.state as string | null,
    zip: r.zip as string | null,
    stage: Number(r.stage),
    leadStatus: r.lead_status as string,
    cashOffer: r.cash_offer as number | null,
    cashPlusOffer: r.cash_plus_offer as number | null,
  }))
}
