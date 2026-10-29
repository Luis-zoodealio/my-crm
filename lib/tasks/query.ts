import 'server-only'
import { sql, type SQL } from 'drizzle-orm'
import type { UserSettings } from '@/lib/bootstrap'
import { db } from '@/lib/db'
import { dueLabel, fullAddress, lastContactDate } from '@/lib/format'
import { GROUP_PAGE, TASK_GROUPS, type TaskGroup } from './groups'

const GROUP_MAX = 1000

export type TaskItem = {
  id: string
  title: string
  description: string | null
  method: string
  source: string
  done: boolean
  dueLabel: string
  dueDate: string
  dueTime: string
  deal: { id: string; label: string; agentId: string | null; agentName: string | null } | null
  agentLastContactLabel: string | null
}

export type TaskGroups = Record<TaskGroup, { count: number; items: TaskItem[] }>

type Raw = Record<string, unknown>

/** How many rows to show per group: GROUP_PAGE by default, raised by "Show more" links (?overdue=50). */
export function parseLimits(raw: Record<string, string | string[] | undefined>): Record<TaskGroup, number> {
  const one = (k: TaskGroup) => {
    const v = Number.parseInt(String(Array.isArray(raw[k]) ? raw[k]![0] : (raw[k] ?? '')), 10)
    return Number.isFinite(v) ? Math.min(GROUP_MAX, Math.max(GROUP_PAGE, v)) : GROUP_PAGE
  }
  return { overdue: one('overdue'), today: one('today'), upcoming: one('upcoming'), completed: one('completed') }
}

export async function getTaskGroups(userId: string, settings: UserSettings, limits: Record<TaskGroup, number>): Promise<TaskGroups> {
  const tz = settings.timezone
  const start = sql`(date_trunc('day', now() at time zone ${tz}) at time zone ${tz})`
  const end = sql`((date_trunc('day', now() at time zone ${tz}) + interval '1 day') at time zone ${tz})`

  const where: Record<TaskGroup, SQL> = {
    overdue: sql`not t.done and t.due_at < ${start}`,
    today: sql`not t.done and t.due_at >= ${start} and t.due_at < ${end}`,
    upcoming: sql`not t.done and t.due_at >= ${end}`,
    completed: sql`t.done`,
  }
  const order: Record<TaskGroup, SQL> = {
    overdue: sql`t.due_at asc, t.id`,
    today: sql`t.due_at asc, t.id`,
    upcoming: sql`t.due_at asc, t.id`,
    completed: sql`t.done_at desc nulls last, t.id`,
  }

  const results = await Promise.all(
    TASK_GROUPS.map((g) =>
      db.execute(sql`
        select t.id, t.title, t.description, t.method, t.source, t.done,
               extract(epoch from t.due_at)::float8 as due_epoch,
               to_char(t.due_at at time zone ${tz}, 'YYYY-MM-DD') as due_date,
               to_char(t.due_at at time zone ${tz}, 'HH24:MI') as due_time,
               d.id as deal_id, d.address, d.city, d.state, d.zip,
               a.id as agent_id, a.name as agent_name,
               (select extract(epoch from max(n.created_at))::float8
                  from crm.notes n
                  join crm.deals d2 on d2.id = n.deal_id and d2.user_id = t.user_id
                 where d2.agent_id = a.id) as agent_last_contact_epoch,
               count(*) over () as total
          from crm.tasks t
          left join crm.deals d on d.id = t.deal_id and d.user_id = t.user_id
          left join crm.agents a on a.id = d.agent_id
         where t.user_id = ${userId} and ${where[g]}
         order by ${order[g]}
         limit ${limits[g]}`),
    ),
  )

  const now = new Date()
  const out = {} as TaskGroups
  TASK_GROUPS.forEach((g, i) => {
    const rows = [...results[i]] as Raw[]
    out[g] = {
      count: rows.length ? Number(rows[0].total) : 0,
      items: rows.map((r) => ({
        id: r.id as string,
        title: r.title as string,
        description: r.description as string | null,
        method: r.method as string,
        source: r.source as string,
        done: r.done as boolean,
        dueLabel: dueLabel(new Date(Number(r.due_epoch) * 1000), tz, now),
        dueDate: r.due_date as string,
        dueTime: r.due_time as string,
        agentLastContactLabel: r.agent_last_contact_epoch
          ? lastContactDate(new Date(Number(r.agent_last_contact_epoch) * 1000).toISOString(), tz)
          : null,
        deal: r.deal_id
          ? {
              id: r.deal_id as string,
              label: fullAddress({ address: r.address as string, city: r.city as string | null, state: r.state as string | null, zip: r.zip as string | null }),
              agentId: r.agent_id as string | null,
              agentName: r.agent_name as string | null,
            }
          : null,
      })),
    }
  })
  return out
}
