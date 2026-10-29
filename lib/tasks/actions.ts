'use server'

import { and, eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { tasks } from '@/lib/db/schema'
import { fullAddress } from '@/lib/format'
import { CONTACT_METHODS } from '@/lib/stages'

export type Result = { ok: true } | { ok: false; error: string }

function fail(e: unknown): Result {
  if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? 'Invalid input.' }
  console.error(e)
  return { ok: false, error: 'Something went wrong. Please try again.' }
}

const refresh = () => revalidatePath('/', 'layout')
const id = z.uuid()

const NewTask = z.object({
  dealId: id.nullable(),
  title: z.string().trim().min(1, 'Give the task a title.').max(200, 'Keep the title under 200 characters.'),
  description: z
    .string()
    .trim()
    .max(2000)
    .transform((s) => (s === '' ? null : s)),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date.'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Pick a time.'),
  method: z.enum(CONTACT_METHODS),
})

/** Manual task, optionally linked to a deal. Unlike a deal follow-up it doesn't replace anything. */
export async function createTask(input: { dealId: string | null; title: string; description: string; date: string; time: string; method: string }): Promise<Result> {
  try {
    const user = await requireUser()
    const v = NewTask.parse(input)
    await db.insert(tasks).values({
      userId: user.id,
      dealId: v.dealId,
      title: v.title,
      description: v.description,
      dueAt: sql`((${v.date}::date + ${v.time}::time) at time zone ${user.settings.timezone})`,
      method: v.method,
      source: 'Manual',
    })
    refresh()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

/**
 * Completing a task never touches the deal itself. A deal's "next follow-up" is its earliest
 * open Follow-up task, so completing one simply moves the deal on to its next one (or none).
 */
export async function setTaskDone(taskId: string, done: boolean): Promise<Result> {
  try {
    const user = await requireUser()
    await db
      .update(tasks)
      .set({ done, doneAt: done ? sql`now()` : null })
      .where(and(eq(tasks.id, id.parse(taskId)), eq(tasks.userId, user.id)))
    refresh()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

const EditTask = z.object({
  title: z.string().trim().min(1, 'Give the task a title.').max(200, 'Keep the title under 200 characters.'),
  description: z
    .string()
    .trim()
    .max(2000)
    .transform((s) => (s === '' ? null : s)),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date.'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Pick a time.'),
  method: z.enum(CONTACT_METHODS),
})

export async function updateTask(taskId: string, input: { title: string; description: string; date: string; time: string; method: string }): Promise<Result> {
  try {
    const user = await requireUser()
    const v = EditTask.parse(input)
    await db
      .update(tasks)
      .set({
        title: v.title,
        description: v.description,
        dueAt: sql`((${v.date}::date + ${v.time}::time) at time zone ${user.settings.timezone})`,
        method: v.method,
      })
      .where(and(eq(tasks.id, id.parse(taskId)), eq(tasks.userId, user.id)))
    refresh()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function deleteTask(taskId: string): Promise<Result> {
  try {
    const user = await requireUser()
    await db.delete(tasks).where(and(eq(tasks.id, id.parse(taskId)), eq(tasks.userId, user.id)))
    refresh()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

/** Deal picker for the schedule modal: top 6 matches by address, city, ZIP, agent name or agency. */
export async function searchDeals(q: string): Promise<{ id: string; label: string; agentName: string | null }[]> {
  const user = await requireUser()
  const term = q.trim().slice(0, 100)
  if (!term) return []
  const like = `%${term.replace(/[\\%_]/g, (c) => '\\' + c)}%`
  const rows = await db.execute(sql`
    select d.id, d.address, d.city, d.state, d.zip, a.name as agent_name
      from crm.deals d
      left join crm.agents a on a.id = d.agent_id
     where d.user_id = ${user.id}
       and concat_ws(' ', d.address, d.city, d.state, d.zip, a.name, a.agency) ilike ${like}
     order by lower(d.address)
     limit 6`)
  return ([...rows] as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    label: fullAddress({ address: r.address as string, city: r.city as string | null, state: r.state as string | null, zip: r.zip as string | null }),
    agentName: r.agent_name as string | null,
  }))
}
