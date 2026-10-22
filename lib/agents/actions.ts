'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { agents } from '@/lib/db/schema'

export type AgentResult = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> }

const optional = (max: number) => z.string().trim().max(max, `Keep this under ${max} characters.`).transform((s) => (s === '' ? null : s))

const AgentInput = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(120, 'Keep the name under 120 characters.'),
  agency: optional(120),
  phone: optional(40),
  email: z
    .string()
    .trim()
    .max(160)
    .transform((s) => (s === '' ? null : s))
    .pipe(z.email('Enter a valid email address.').nullable()),
})

const isUniqueViolation = (e: unknown) => {
  const err = e as { code?: string; cause?: { code?: string } }
  return err?.code === '23505' || err?.cause?.code === '23505'
}

/** Edits the shared agent record, so the change shows on every deal with this agent. */
export async function updateAgent(agentId: string, input: { name: string; agency: string; phone: string; email: string }): Promise<AgentResult> {
  try {
    const user = await requireUser()
    const v = AgentInput.parse(input)
    const res = await db
      .update(agents)
      .set(v)
      .where(and(eq(agents.id, z.uuid().parse(agentId)), eq(agents.userId, user.id)))
      .returning({ id: agents.id })
    if (res.length === 0) return { ok: false, error: 'That agent no longer exists.' }
    revalidatePath('/', 'layout')
    return { ok: true }
  } catch (e) {
    if (e instanceof z.ZodError) {
      const fieldErrors: Record<string, string> = {}
      for (const i of e.issues) fieldErrors[String(i.path[0] ?? 'form')] ??= i.message
      return { ok: false, error: e.issues[0]?.message ?? 'Invalid input.', fieldErrors }
    }
    if (isUniqueViolation(e)) return { ok: false, error: 'You already have an agent with that name and agency.', fieldErrors: { name: 'You already have an agent with that name and agency.' } }
    console.error(e)
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
}
