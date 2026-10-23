'use server'

import { and, eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { cadences, deals } from '@/lib/db/schema'
import { CONTACT_METHODS } from '@/lib/stages'

export type Result = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> }

const refresh = () => revalidatePath('/', 'layout')
const id = z.uuid()

function fail(e: unknown): Result {
  if (e instanceof z.ZodError) {
    const fieldErrors: Record<string, string> = {}
    for (const i of e.issues) fieldErrors[String(i.path[0] ?? 'form')] ??= i.message
    return { ok: false, error: e.issues[0]?.message ?? 'Invalid input.', fieldErrors }
  }
  console.error(e)
  return { ok: false, error: 'Something went wrong. Please try again.' }
}

const Step = z.object({ days: z.coerce.number().int().min(0, 'Days must be 0 or more.').max(365), method: z.enum(CONTACT_METHODS) })
const CadenceInput = z.object({
  name: z.string().trim().min(1, 'Name the cadence.').max(80, 'Keep the name under 80 characters.'),
  steps: z.array(Step).min(1, 'Add at least one step.').max(20, 'Keep it to 20 steps or fewer.'),
})
export type CadenceInputType = z.input<typeof CadenceInput>

export async function createCadence(input: CadenceInputType): Promise<Result> {
  try {
    const user = await requireUser()
    const v = CadenceInput.parse(input)
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(cadences).where(eq(cadences.userId, user.id))
    await db.insert(cadences).values({ userId: user.id, name: v.name, steps: v.steps, position: Number(n) })
    refresh()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function updateCadence(cadenceId: string, input: CadenceInputType): Promise<Result> {
  try {
    const user = await requireUser()
    const v = CadenceInput.parse(input)
    const res = await db
      .update(cadences)
      .set({ name: v.name, steps: v.steps })
      .where(and(eq(cadences.id, id.parse(cadenceId)), eq(cadences.userId, user.id)))
      .returning({ id: cadences.id })
    if (res.length === 0) return { ok: false, error: 'That cadence no longer exists.' }
    refresh()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

/** Deleting a cadence clears it off any deals using it (FK on delete set null). */
export async function deleteCadence(cadenceId: string): Promise<Result> {
  try {
    const user = await requireUser()
    await db.delete(cadences).where(and(eq(cadences.id, id.parse(cadenceId)), eq(cadences.userId, user.id)))
    refresh()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

/** Put a deal on a cadence (resetting it to step 0) or take it off (null). */
export async function setDealCadence(dealId: string, cadenceId: string | null): Promise<Result> {
  try {
    const user = await requireUser()
    const did = id.parse(dealId)
    const cid = cadenceId === null ? null : id.parse(cadenceId)
    if (cid) {
      const [c] = await db.select({ id: cadences.id }).from(cadences).where(and(eq(cadences.id, cid), eq(cadences.userId, user.id)))
      if (!c) return { ok: false, error: 'That cadence no longer exists.' }
    }
    await db.update(deals).set({ cadenceId: cid, cadenceStep: 0 }).where(and(eq(deals.id, did), eq(deals.userId, user.id)))
    refresh()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}
