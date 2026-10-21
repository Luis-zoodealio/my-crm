import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import type { UserSettings } from '@/lib/bootstrap'
import { LAST_ACTIVE_STAGE } from '@/lib/stages'

export type DashboardRow = {
  dealId: string
  address: string
  city: string | null
  state: string | null
  zip: string | null
  agentName: string | null
  leadStatus: string
  stage: number
  /** Task title for follow-ups; unused for stale rows. */
  title: string | null
  method: string | null
  daysSinceContact: number
}

export type DashboardData = {
  hot: { count: number; offers: number }
  overdue: { count: number; rows: DashboardRow[] }
  today: { count: number; rows: DashboardRow[] }
  stale: { count: number; rows: DashboardRow[] }
  underContract: { count: number; offers: number }
  totalDeals: number
}

const ROW_LIMIT = 8

type Raw = Record<string, unknown>
const toRow = (r: Raw): DashboardRow => ({
  dealId: r.deal_id as string,
  address: r.address as string,
  city: r.city as string | null,
  state: r.state as string | null,
  zip: r.zip as string | null,
  agentName: r.agent_name as string | null,
  leadStatus: r.lead_status as string,
  stage: Number(r.stage),
  title: (r.title as string | null) ?? null,
  method: (r.method as string | null) ?? null,
  daysSinceContact: Number(r.days_since_contact),
})

// Local-midnight bounds of "today" in the user's timezone, as timestamptz.
const dayStart = (tz: string) => sql`(date_trunc('day', now() at time zone ${tz}) at time zone ${tz})`
const dayEnd = (tz: string) => sql`((date_trunc('day', now() at time zone ${tz}) + interval '1 day') at time zone ${tz})`

/** Open follow-ups on active deals due inside [from, to). Pass null for an open bound. */
function followUps(userId: string, from: ReturnType<typeof sql> | null, to: ReturnType<typeof sql> | null) {
  const range = [from ? sql`and t.due_at >= ${from}` : sql``, to ? sql`and t.due_at < ${to}` : sql``]
  return db.execute(sql`
    select d.id as deal_id, d.address, d.city, d.state, d.zip, a.name as agent_name,
           d.lead_status, d.stage, t.title, t.method,
           extract(day from now() - d.last_contact_at)::int as days_since_contact,
           count(*) over () as total
      from crm.tasks t
      join crm.deals d on d.id = t.deal_id and d.user_id = t.user_id
      left join crm.agents a on a.id = d.agent_id
     where t.user_id = ${userId}
       and not t.done
       and d.stage <= ${LAST_ACTIVE_STAGE}
       ${range[0]} ${range[1]}
     order by t.due_at asc
     limit ${ROW_LIMIT}`)
}

export async function getDashboard(userId: string, settings: UserSettings): Promise<DashboardData> {
  const { staleDays, timezone } = settings
  const start = dayStart(timezone)
  const end = dayEnd(timezone)

  const [stats, overdue, today, stale] = await Promise.all([
    db.execute(sql`
      select
        count(*) filter (where lead_status = 'Hot' and stage <= ${LAST_ACTIVE_STAGE})::int as hot_count,
        coalesce(sum(cash_offer) filter (where lead_status = 'Hot' and stage <= ${LAST_ACTIVE_STAGE}), 0)::float8 as hot_offers,
        count(*) filter (where stage in (8, 9))::int as uc_count,
        coalesce(sum(cash_offer) filter (where stage in (8, 9)), 0)::float8 as uc_offers,
        count(*)::int as total
      from crm.deals where user_id = ${userId}`),
    followUps(userId, null, start),
    followUps(userId, start, end),
    db.execute(sql`
      select d.id as deal_id, d.address, d.city, d.state, d.zip, a.name as agent_name,
             d.lead_status, d.stage, null::text as title, null::text as method,
             extract(day from now() - d.last_contact_at)::int as days_since_contact,
             count(*) over () as total
        from crm.deals d
        left join crm.agents a on a.id = d.agent_id
       where d.user_id = ${userId}
         and d.stage <= ${LAST_ACTIVE_STAGE}
         and now() - d.last_contact_at >= make_interval(days => ${staleDays})
       order by d.last_contact_at asc
       limit ${ROW_LIMIT}`),
  ])

  const s = stats[0] as Raw
  const pack = (rows: Raw[]) => ({ count: rows.length ? Number(rows[0].total) : 0, rows: rows.map(toRow) })

  return {
    hot: { count: Number(s.hot_count), offers: Number(s.hot_offers) },
    overdue: pack([...overdue]),
    today: pack([...today]),
    stale: pack([...stale]),
    underContract: { count: Number(s.uc_count), offers: Number(s.uc_offers) },
    totalDeals: Number(s.total),
  }
}
