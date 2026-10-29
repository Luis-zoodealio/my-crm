import 'server-only'
import { and, desc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import type { UserSettings } from '@/lib/bootstrap'
import { db } from '@/lib/db'
import { activity, notes, propertyNotes } from '@/lib/db/schema'

export type DealDetail = {
  id: string
  address: string
  city: string | null
  state: string | null
  zip: string | null
  stage: number
  leadStatus: string
  equityStatus: string
  cashOffer: number | null
  cashPlusOffer: number | null
  daysSinceContact: number
  followUps: number
  firstContactDays: number | null
  agent: { id: string; name: string; agency: string | null; phone: string | null; email: string | null; dealCount: number } | null
  followUp: { title: string; description: string | null; method: string; days: number } | null
  cadence: { id: string; name: string; steps: { days: number; method: string }[]; step: number } | null
}

export type NoteItem = { id: string; type: string; body: string; when: string }

type Raw = Record<string, unknown>

/** "Today, 3:45 PM" / "Oct 12" / "Oct 12, 2025" in the user's timezone. */
export function whenLabel(d: Date, timezone: string, now = new Date()): string {
  const day = (x: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(x)
  if (day(d) === day(now)) {
    return 'Today, ' + new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: timezone }).format(d)
  }
  const sameYear = new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: timezone }).format(d) ===
    new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: timezone }).format(now)
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }), timeZone: timezone }).format(d)
}

export async function getDealDetail(userId: string, id: string, settings: UserSettings): Promise<DealDetail | null> {
  if (!z.uuid().safeParse(id).success) return null
  const tz = settings.timezone
  const [r] = (await db.execute(sql`
    select d.id, d.address, d.city, d.state, d.zip, d.stage, d.lead_status, d.equity_status,
           d.cash_offer::float8 as cash_offer, d.cash_plus_offer::float8 as cash_plus_offer,
           floor(extract(epoch from (now() - d.last_contact_at)) / 86400)::int as days_since_contact,
           (select count(*)::int from crm.notes n where n.deal_id = d.id) as note_count,
           floor(extract(epoch from (now() - (select min(n.created_at) from crm.notes n where n.deal_id = d.id))) / 86400)::int as first_contact_days,
           a.id as agent_id, a.name as agent_name, a.agency, a.phone, a.email,
           (select count(*)::int from crm.deals x where x.agent_id = d.agent_id and x.user_id = d.user_id) as agent_deals,
           fu.title as fu_title, fu.description as fu_description, fu.method as fu_method,
           ((fu.due_at at time zone ${tz})::date - (now() at time zone ${tz})::date)::int as fu_days,
           d.cadence_id, d.cadence_step, c.name as cadence_name, c.steps as cadence_steps
      from crm.deals d
      left join crm.agents a on a.id = d.agent_id
      left join crm.cadences c on c.id = d.cadence_id
      left join lateral (
        select t.due_at, t.title, t.description, t.method
          from crm.tasks t
         where t.deal_id = d.id and t.user_id = d.user_id and not t.done and t.source = 'Follow-up'
         order by t.due_at asc limit 1
      ) fu on true
     where d.id = ${id} and d.user_id = ${userId}`)) as Raw[]
  if (!r) return null

  return {
    id: r.id as string,
    address: r.address as string,
    city: r.city as string | null,
    state: r.state as string | null,
    zip: r.zip as string | null,
    stage: Number(r.stage),
    leadStatus: r.lead_status as string,
    equityStatus: r.equity_status as string,
    cashOffer: r.cash_offer as number | null,
    cashPlusOffer: r.cash_plus_offer as number | null,
    daysSinceContact: Number(r.days_since_contact),
    followUps: Math.max(0, Number(r.note_count) - 1),
    firstContactDays: Number(r.note_count) > 0 ? Number(r.first_contact_days) : null,
    agent: r.agent_id
      ? {
          id: r.agent_id as string,
          name: r.agent_name as string,
          agency: r.agency as string | null,
          phone: r.phone as string | null,
          email: r.email as string | null,
          dealCount: Number(r.agent_deals),
        }
      : null,
    followUp: r.fu_title
      ? { title: r.fu_title as string, description: r.fu_description as string | null, method: r.fu_method as string, days: Number(r.fu_days) }
      : null,
    cadence: r.cadence_id
      ? { id: r.cadence_id as string, name: r.cadence_name as string, steps: (r.cadence_steps as { days: number; method: string }[]) ?? [], step: Number(r.cadence_step) }
      : null,
  }
}

// ---------- open tasks on a deal ----------
export type DealTask = { id: string; title: string; description: string | null; method: string; source: string; days: number; dueDate: string; dueTime: string }

/** Every not-done task on the deal (follow-ups and manual), soonest due first. `days` is relative to today in the user's tz. */
export async function getOpenTasks(userId: string, dealId: string, tz: string): Promise<DealTask[]> {
  const rows = await db.execute(sql`
    select t.id, t.title, t.description, t.method, t.source,
           ((t.due_at at time zone ${tz})::date - (now() at time zone ${tz})::date)::int as days,
           to_char(t.due_at at time zone ${tz}, 'YYYY-MM-DD') as due_date,
           to_char(t.due_at at time zone ${tz}, 'HH24:MI') as due_time
      from crm.tasks t
     where t.deal_id = ${dealId} and t.user_id = ${userId} and not t.done
     order by t.due_at asc`)
  return ([...rows] as Raw[]).map((r) => ({
    id: r.id as string,
    title: r.title as string,
    description: r.description as string | null,
    method: r.method as string,
    source: r.source as string,
    days: Number(r.days),
    dueDate: r.due_date as string,
    dueTime: r.due_time as string,
  }))
}

// ---------- unified timeline ----------
export type TimelineItem =
  | { source: 'exchange'; id: string; method: string; body: string; when: string }
  | { source: 'property'; id: string; body: string; when: string }
  | { source: 'event'; id: string; kind: string; data: Record<string, unknown>; when: string }

const TIMELINE_PAGE = 50

/** One chronological feed per deal: exchanges, property notes and system events merged, newest first. */
export async function getTimeline(userId: string, dealId: string, tz: string, all: boolean) {
  const lim = all ? 2000 : 60
  const [ex, pn, ev] = await Promise.all([
    db.select().from(notes).where(and(eq(notes.userId, userId), eq(notes.dealId, dealId))).orderBy(desc(notes.createdAt), desc(notes.id)).limit(lim),
    db.select().from(propertyNotes).where(and(eq(propertyNotes.userId, userId), eq(propertyNotes.dealId, dealId))).orderBy(desc(propertyNotes.createdAt), desc(propertyNotes.id)).limit(lim),
    db.select().from(activity).where(and(eq(activity.userId, userId), eq(activity.dealId, dealId))).orderBy(desc(activity.createdAt), desc(activity.id)).limit(lim),
  ])
  const rows: { at: Date; item: TimelineItem }[] = [
    ...ex.map((n) => ({ at: n.createdAt, item: { source: 'exchange' as const, id: n.id, method: n.type, body: n.body, when: whenLabel(n.createdAt, tz) } })),
    ...pn.map((n) => ({ at: n.createdAt, item: { source: 'property' as const, id: n.id, body: n.body, when: whenLabel(n.createdAt, tz) } })),
    ...ev.map((a) => ({ at: a.createdAt, item: { source: 'event' as const, id: a.id, kind: a.kind, data: (a.data ?? {}) as Record<string, unknown>, when: whenLabel(a.createdAt, tz) } })),
  ].sort((x, y) => y.at.getTime() - x.at.getTime())
  const sliced = all ? rows : rows.slice(0, TIMELINE_PAGE)
  return { items: sliced.map((r) => r.item), hasMore: !all && rows.length > TIMELINE_PAGE }
}
