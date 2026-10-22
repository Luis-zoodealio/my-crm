'use server'

import { and, eq, ilike, or, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { agents, deals, notes, propertyNotes, tasks } from '@/lib/db/schema'
import { CONTACT_METHODS, LEAD_STATUSES } from '@/lib/stages'

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string; fieldErrors?: Record<string, string> }

function fail(e: unknown): { ok: false; error: string; fieldErrors?: Record<string, string> } {
  if (e instanceof z.ZodError) {
    const fieldErrors: Record<string, string> = {}
    for (const i of e.issues) fieldErrors[String(i.path[0] ?? 'form')] ??= i.message
    return { ok: false, error: e.issues[0]?.message ?? 'Invalid input.', fieldErrors }
  }
  console.error(e)
  return { ok: false, error: 'Something went wrong. Please try again.' }
}

// Dashboard counts, sidebar badges, Leads and the deal page all depend on deal data.
const refresh = () => revalidatePath('/', 'layout')

const id = z.uuid()
const text = (max: number) => z.string().trim().max(max).transform((s) => (s === '' ? null : s))
const money = z
  .union([z.string(), z.number(), z.null()])
  .transform((v, ctx) => {
    if (v === null || v === '') return null
    const n = Number(v)
    if (!Number.isFinite(n) || n < 0 || n > 999_999_999) {
      ctx.addIssue({ code: 'custom', message: 'Enter a dollar amount between $0 and $999,999,999.' })
      return z.NEVER
    }
    return Math.round(n * 100) / 100
  })

const DealInput = z.object({
  address: z.string().trim().min(1, 'Address is required.').max(200),
  city: text(100),
  state: text(20),
  zip: text(12),
  stage: z.coerce.number().int().min(0).max(11),
  leadStatus: z.enum(LEAD_STATUSES),
  cashOffer: money,
  cashPlusOffer: money,
  agent: z.discriminatedUnion('mode', [
    z.object({ mode: z.literal('none') }),
    z.object({ mode: z.literal('existing'), id }),
    z.object({
      mode: z.literal('new'),
      name: z.string().trim().min(1, 'Agent name is required.').max(120),
      agency: text(120),
      phone: text(40),
      email: text(160),
    }),
  ]),
})
export type DealInputType = z.input<typeof DealInput>

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

async function resolveAgent(tx: Tx, userId: string, a: z.output<typeof DealInput>['agent']): Promise<string | null> {
  if (a.mode === 'none') return null
  if (a.mode === 'existing') {
    const [row] = await tx.select({ id: agents.id }).from(agents).where(and(eq(agents.id, a.id), eq(agents.userId, userId)))
    if (!row) throw new z.ZodError([{ code: 'custom', path: ['agent'], message: 'That agent no longer exists.' }])
    return row.id
  }
  // Reuse an agent with the same name and agency instead of creating a duplicate.
  const [dupe] = await tx
    .select({ id: agents.id })
    .from(agents)
    .where(and(eq(agents.userId, userId), sql`lower(${agents.name}) = lower(${a.name})`, sql`coalesce(lower(${agents.agency}), '') = coalesce(lower(${a.agency}), '')`))
  if (dupe) return dupe.id
  const [row] = await tx.insert(agents).values({ userId, name: a.name, agency: a.agency, phone: a.phone, email: a.email }).returning({ id: agents.id })
  return row.id
}

export async function createDeal(input: DealInputType): Promise<Result<{ id: string }>> {
  try {
    const user = await requireUser()
    const v = DealInput.parse(input)
    const dealId = await db.transaction(async (tx) => {
      const agentId = await resolveAgent(tx, user.id, v.agent)
      const [row] = await tx
        .insert(deals)
        .values({ userId: user.id, agentId, address: v.address, city: v.city, state: v.state, zip: v.zip, stage: v.stage, leadStatus: v.leadStatus, cashOffer: v.cashOffer, cashPlusOffer: v.cashPlusOffer })
        .returning({ id: deals.id })
      return row.id
    })
    refresh()
    return { ok: true, id: dealId }
  } catch (e) {
    return fail(e)
  }
}

export async function updateDeal(dealId: string, input: DealInputType): Promise<Result<{ id: string }>> {
  try {
    const user = await requireUser()
    const v = DealInput.parse(input)
    const found = await db.transaction(async (tx) => {
      const agentId = await resolveAgent(tx, user.id, v.agent)
      const res = await tx
        .update(deals)
        .set({ agentId, address: v.address, city: v.city, state: v.state, zip: v.zip, stage: v.stage, leadStatus: v.leadStatus, cashOffer: v.cashOffer, cashPlusOffer: v.cashPlusOffer })
        .where(and(eq(deals.id, id.parse(dealId)), eq(deals.userId, user.id)))
        .returning({ id: deals.id })
      return res.length > 0
    })
    if (!found) return { ok: false, error: 'That deal no longer exists.' }
    refresh()
    return { ok: true, id: dealId }
  } catch (e) {
    return fail(e)
  }
}

/** Deletes the deal and, via cascade, its notes, property notes and tasks. */
export async function deleteDeal(dealId: string): Promise<Result> {
  try {
    const user = await requireUser()
    await db.delete(deals).where(and(eq(deals.id, id.parse(dealId)), eq(deals.userId, user.id)))
    refresh()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function setLeadStatus(dealId: string, status: string): Promise<Result> {
  try {
    const user = await requireUser()
    const s = z.enum(LEAD_STATUSES).parse(status)
    await db.update(deals).set({ leadStatus: s }).where(and(eq(deals.id, id.parse(dealId)), eq(deals.userId, user.id)))
    refresh()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function setStage(dealId: string, stage: number): Promise<Result> {
  try {
    const user = await requireUser()
    const s = z.number().int().min(0).max(11).parse(stage)
    await db.update(deals).set({ stage: s }).where(and(eq(deals.id, id.parse(dealId)), eq(deals.userId, user.id)))
    refresh()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

// ---------- notes ----------
const NoteBody = z.string().trim().min(1, 'Write something first.').max(5000, 'Notes are limited to 5,000 characters.')

export async function addNote(dealId: string, type: string, body: string): Promise<Result> {
  try {
    const user = await requireUser()
    const v = z.object({ dealId: id, type: z.enum(CONTACT_METHODS), body: NoteBody }).parse({ dealId, type, body })
    await db.insert(notes).values({ userId: user.id, dealId: v.dealId, type: v.type, body: v.body, createdBy: user.id })
    refresh()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function updateNote(noteId: string, type: string, body: string): Promise<Result> {
  try {
    const user = await requireUser()
    const v = z.object({ noteId: id, type: z.enum(CONTACT_METHODS), body: NoteBody }).parse({ noteId, type, body })
    const res = await db.update(notes).set({ type: v.type, body: v.body }).where(and(eq(notes.id, v.noteId), eq(notes.userId, user.id))).returning({ id: notes.id })
    if (res.length === 0) return { ok: false, error: 'That note no longer exists.' }
    refresh()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function deleteNote(noteId: string): Promise<Result> {
  try {
    const user = await requireUser()
    await db.delete(notes).where(and(eq(notes.id, id.parse(noteId)), eq(notes.userId, user.id)))
    refresh()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function addPropertyNote(dealId: string, body: string): Promise<Result> {
  try {
    const user = await requireUser()
    const v = z.object({ dealId: id, body: NoteBody }).parse({ dealId, body })
    await db.insert(propertyNotes).values({ userId: user.id, dealId: v.dealId, body: v.body, createdBy: user.id })
    refresh()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function updatePropertyNote(noteId: string, body: string): Promise<Result> {
  try {
    const user = await requireUser()
    const v = z.object({ noteId: id, body: NoteBody }).parse({ noteId, body })
    const res = await db.update(propertyNotes).set({ body: v.body }).where(and(eq(propertyNotes.id, v.noteId), eq(propertyNotes.userId, user.id))).returning({ id: propertyNotes.id })
    if (res.length === 0) return { ok: false, error: 'That note no longer exists.' }
    refresh()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function deletePropertyNote(noteId: string): Promise<Result> {
  try {
    const user = await requireUser()
    await db.delete(propertyNotes).where(and(eq(propertyNotes.id, id.parse(noteId)), eq(propertyNotes.userId, user.id)))
    refresh()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

// ---------- follow-up ----------
const FollowUpInput = z.object({
  dealId: id,
  title: z.string().trim().max(200).transform((s) => s || 'Follow up'),
  description: text(2000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date.'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Pick a time.'),
  method: z.enum(CONTACT_METHODS),
})

/**
 * Sets the deal's next follow-up. A deal has one pending follow-up, so this replaces any
 * open Follow-up task on it; completed tasks and Manual tasks are left alone.
 */
export async function scheduleFollowUp(input: z.input<typeof FollowUpInput>): Promise<Result> {
  try {
    const user = await requireUser()
    const v = FollowUpInput.parse(input)
    await db.transaction(async (tx) => {
      await tx.delete(tasks).where(and(eq(tasks.userId, user.id), eq(tasks.dealId, v.dealId), eq(tasks.source, 'Follow-up'), eq(tasks.done, false)))
      await tx.insert(tasks).values({
        userId: user.id,
        dealId: v.dealId,
        title: v.title,
        description: v.description,
        // Date and time are wall-clock values in the user's timezone.
        dueAt: sql`((${v.date}::date + ${v.time}::time) at time zone ${user.settings.timezone})`,
        method: v.method,
        source: 'Follow-up',
      })
    })
    refresh()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

// ---------- agent picker ----------
export async function searchAgents(q: string): Promise<{ id: string; name: string; agency: string | null }[]> {
  const user = await requireUser()
  const term = q.trim().slice(0, 100)
  if (!term) return []
  const like = `%${term.replace(/[\\%_]/g, (c) => '\\' + c)}%`
  return db
    .select({ id: agents.id, name: agents.name, agency: agents.agency })
    .from(agents)
    .where(and(eq(agents.userId, user.id), or(ilike(agents.name, like), ilike(agents.agency, like))))
    .orderBy(agents.name)
    .limit(8)
}
