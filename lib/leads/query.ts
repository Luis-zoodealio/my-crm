import 'server-only'
import { sql, type SQL } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import type { UserSettings } from '@/lib/bootstrap'
import { LAST_ACTIVE_STAGE, LEAD_STATUSES, STAGES } from '@/lib/stages'
import type { Rule, Sort } from '@/lib/views'
import { PAGE_SIZE, STATUS_OPTIONS, type FieldKey, type SortKey } from './spec'

type Raw = Record<string, unknown>

const DAYS_SINCE_CONTACT = sql`floor(extract(epoch from (now() - d.last_contact_at)) / 86400)`
const fuDays = (tz: string) => sql`((fu.due_at at time zone ${tz})::date - (now() at time zone ${tz})::date)`

// Earliest open follow-up task per deal ("next follow-up").
const NEXT_FOLLOW_UP = sql`
  left join lateral (
    select t.due_at, t.title, t.method
      from crm.tasks t
     where t.deal_id = d.id and t.user_id = d.user_id and not t.done and t.source = 'Follow-up'
     order by t.due_at asc
     limit 1
  ) fu on true`

const NUM_OPS = { gte: sql.raw('>='), lte: sql.raw('<='), eq: sql.raw('=') } as const
const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => '\\' + c)

/** One rule -> SQL predicate. Returns null for rules that should be ignored (empty or invalid values). */
function predicate(rule: Rule, tz: string): SQL | null {
  const { op, value } = rule
  const field = rule.field as FieldKey
  const not = op === 'ne'

  switch (field) {
    case 'status': {
      if (!(STATUS_OPTIONS as readonly string[]).includes(value)) return null
      const p = value === 'Active' ? sql`d.stage <= ${LAST_ACTIVE_STAGE}` : value === 'Closed' ? sql`d.stage = 10` : sql`d.stage = 11`
      return not ? sql`not (${p})` : p
    }
    case 'temp':
      if (!(LEAD_STATUSES as readonly string[]).includes(value)) return null
      return not ? sql`d.lead_status <> ${value}` : sql`d.lead_status = ${value}`
    case 'stage': {
      const i = STAGES.findIndex((s) => s.name === value)
      if (i < 0) return null
      return not ? sql`d.stage <> ${i}` : sql`d.stage = ${i}`
    }
    case 'agent':
      if (!z.uuid().safeParse(value).success) return null
      return not ? sql`d.agent_id is distinct from ${value}::uuid` : sql`d.agent_id = ${value}::uuid`
    case 'q': {
      const v = value.trim()
      if (!v) return null
      return sql`concat_ws(' ', d.address, d.city, d.state, d.zip, a.name, a.agency) ilike ${'%' + escapeLike(v) + '%'}`
    }
    case 'days':
    case 'offer':
    case 'fu': {
      if (value.trim() === '' || !Number.isFinite(Number(value))) return null
      const cmp = NUM_OPS[op as keyof typeof NUM_OPS]
      if (!cmp) return null
      const expr = field === 'days' ? DAYS_SINCE_CONTACT : field === 'offer' ? sql`d.cash_offer` : fuDays(tz)
      return sql`${expr} ${cmp} ${Number(value)}`
    }
  }
}

function orderBy(sorts: Sort[]): SQL {
  const exprs: Record<SortKey, SQL> = {
    temp: sql`case d.lead_status when 'Hot' then 0 when 'Warm' then 1 when 'Cold' then 2 else 3 end`,
    stage: sql`d.stage`,
    days: sql`d.last_contact_at`, // fewer days since contact == later timestamp, so direction is flipped below
    offer: sql`d.cash_offer`,
    fu: sql`fu.due_at`,
    agent: sql`lower(a.name)`,
    addr: sql`lower(d.address || ', ' || coalesce(d.city, ''))`,
  }
  const parts = sorts.filter((s) => s.k in exprs).map((s) => {
    const asc = s.k === 'days' ? s.dir === 'desc' : s.dir === 'asc'
    return sql`${exprs[s.k as SortKey]} ${sql.raw(asc ? 'asc' : 'desc')} nulls last`
  })
  if (parts.length === 0) parts.push(sql`d.last_contact_at desc`)
  parts.push(sql`d.id`) // stable pagination
  return sql.join(parts, sql`, `)
}

export type LeadRow = {
  id: string
  address: string
  city: string | null
  state: string | null
  zip: string | null
  stage: number
  leadStatus: string
  cashOffer: number | null
  cashPlusOffer: number | null
  agentName: string | null
  daysSinceContact: number
}

export async function queryLeads(userId: string, settings: UserSettings, rules: Rule[], sorts: Sort[], page: number) {
  const where = [sql`d.user_id = ${userId}`, ...rules.map((r) => predicate(r, settings.timezone)).filter((p): p is SQL => p !== null)]
  const rows = await db.execute(sql`
    select d.id, d.address, d.city, d.state, d.zip, d.stage, d.lead_status,
           d.cash_offer::float8 as cash_offer, d.cash_plus_offer::float8 as cash_plus_offer,
           a.name as agent_name,
           ${DAYS_SINCE_CONTACT}::int as days_since_contact,
           count(*) over () as total
      from crm.deals d
      left join crm.agents a on a.id = d.agent_id
      ${NEXT_FOLLOW_UP}
     where ${sql.join(where, sql` and `)}
     order by ${orderBy(sorts)}
     limit ${PAGE_SIZE} offset ${(page - 1) * PAGE_SIZE}`)

  const list = [...rows] as Raw[]
  const leads: LeadRow[] = list.map((r) => ({
    id: r.id as string,
    address: r.address as string,
    city: r.city as string | null,
    state: r.state as string | null,
    zip: r.zip as string | null,
    stage: Number(r.stage),
    leadStatus: r.lead_status as string,
    cashOffer: r.cash_offer as number | null,
    cashPlusOffer: r.cash_plus_offer as number | null,
    agentName: r.agent_name as string | null,
    daysSinceContact: Number(r.days_since_contact),
  }))
  return { leads, total: list.length ? Number(list[0].total) : 0 }
}

export async function countDeals(userId: string): Promise<number> {
  const [r] = await db.execute(sql`select count(*)::int as n from crm.deals where user_id = ${userId}`)
  return Number(r.n)
}

export type QueueItem = { dealId: string; address: string; city: string | null; state: string | null; zip: string | null; title: string; method: string; days: number }

/** Active deals whose next follow-up is overdue or due within 2 days. */
export async function followUpQueue(userId: string, settings: UserSettings): Promise<QueueItem[]> {
  const rows = await db.execute(sql`
    select d.id as deal_id, d.address, d.city, d.state, d.zip, fu.title, fu.method, ${fuDays(settings.timezone)}::int as days
      from crm.deals d
      ${NEXT_FOLLOW_UP}
     where d.user_id = ${userId} and d.stage <= ${LAST_ACTIVE_STAGE} and fu.due_at is not null
       and ${fuDays(settings.timezone)} <= 2
     order by fu.due_at asc
     limit 6`)
  return ([...rows] as Raw[]).map((r) => ({
    dealId: r.deal_id as string,
    address: r.address as string,
    city: r.city as string | null,
    state: r.state as string | null,
    zip: r.zip as string | null,
    title: r.title as string,
    method: r.method as string,
    days: Number(r.days),
  }))
}

/** Options for the Agent filter. Labels add the agency when two agents share a name. */
export async function agentOptions(userId: string): Promise<{ id: string; label: string }[]> {
  const rows = await db.execute(sql`
    select id, name, agency, count(*) over (partition by lower(name)) as same_name
      from crm.agents where user_id = ${userId} order by lower(name), lower(coalesce(agency, ''))`)
  return ([...rows] as Raw[]).map((r) => ({
    id: r.id as string,
    label: Number(r.same_name) > 1 && r.agency ? `${r.name} (${r.agency})` : (r.name as string),
  }))
}
