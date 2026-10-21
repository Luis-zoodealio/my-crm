'use server'

import { and, eq, inArray, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { deals, savedViews } from '@/lib/db/schema'
import { RulesSchema, SortsSchema } from './params'
import { cleanRules } from './spec'

export type ActionResult = { ok: true } | { ok: false; error: string }

const MAX_VIEWS = 50
const MAX_BULK = 500

const ViewInput = z.object({
  name: z.string().trim().min(1, 'Give the view a name.').max(60, 'Keep the name under 60 characters.'),
  rules: RulesSchema,
  sorts: SortsSchema,
})

function fail(e: unknown): ActionResult {
  if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? 'Invalid input.' }
  console.error(e)
  return { ok: false, error: 'Something went wrong. Please try again.' }
}

/** Create a view, or overwrite the one with the same name. */
export async function saveView(input: { name: string; rules: unknown; sorts: unknown }): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const v = ViewInput.parse(input)
    const rules = cleanRules(v.rules)

    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(savedViews)
      .where(eq(savedViews.userId, user.id))
    const exists = await db
      .select({ id: savedViews.id })
      .from(savedViews)
      .where(and(eq(savedViews.userId, user.id), eq(savedViews.name, v.name)))
    if (exists.length === 0 && n >= MAX_VIEWS) return { ok: false, error: `You can keep up to ${MAX_VIEWS} saved views.` }

    await db
      .insert(savedViews)
      .values({ userId: user.id, name: v.name, rules, sorts: v.sorts, position: n })
      .onConflictDoUpdate({ target: [savedViews.userId, savedViews.name], set: { rules, sorts: v.sorts } })
    revalidatePath('/leads')
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function updateView(name: string, input: { rules: unknown; sorts: unknown }): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const rules = cleanRules(RulesSchema.parse(input.rules))
    const sorts = SortsSchema.parse(input.sorts)
    const res = await db
      .update(savedViews)
      .set({ rules, sorts })
      .where(and(eq(savedViews.userId, user.id), eq(savedViews.name, name)))
      .returning({ id: savedViews.id })
    if (res.length === 0) return { ok: false, error: 'That view no longer exists.' }
    revalidatePath('/leads')
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function deleteView(name: string): Promise<ActionResult> {
  try {
    const user = await requireUser()
    await db.delete(savedViews).where(and(eq(savedViews.userId, user.id), eq(savedViews.name, name)))
    revalidatePath('/leads')
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

const BulkInput = z.object({
  ids: z.array(z.uuid()).min(1).max(MAX_BULK),
  action: z.enum(['next-stage', 'mark-hot']),
})

/** Bulk actions apply only to the caller's own deals. Next stage moves active deals up one stage (9 -> Closed). */
export async function bulkUpdateDeals(input: z.input<typeof BulkInput>): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const { ids, action } = BulkInput.parse(input)
    const set =
      action === 'mark-hot'
        ? { leadStatus: 'Hot' }
        : { stage: sql`case when ${deals.stage} < 10 then ${deals.stage} + 1 else ${deals.stage} end` }
    await db
      .update(deals)
      .set(set)
      .where(and(eq(deals.userId, user.id), inArray(deals.id, ids)))
    revalidatePath('/leads')
    revalidatePath('/dashboard')
    revalidatePath('/board')
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}
