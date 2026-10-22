'use server'

import { eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { userSettings } from '@/lib/db/schema'
import { SettingsInput } from './schema'

export type SettingsResult = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> }

export async function updateSettings(input: { staleDays: string | number; timezone: string }): Promise<SettingsResult> {
  try {
    const user = await requireUser()
    const v = SettingsInput.parse(input)
    // The database does the day boundaries, so it has to know the zone too.
    const known = await db.execute(sql`select 1 from pg_timezone_names where name = ${v.timezone} limit 1`)
    if (known.length === 0) return { ok: false, error: 'That time zone is not supported.', fieldErrors: { timezone: 'That time zone is not supported.' } }
    await db.update(userSettings).set({ staleDays: v.staleDays, timezone: v.timezone }).where(eq(userSettings.userId, user.id))
    revalidatePath('/', 'layout')
    return { ok: true }
  } catch (e) {
    if (e instanceof z.ZodError) {
      const fieldErrors: Record<string, string> = {}
      for (const i of e.issues) fieldErrors[String(i.path[0] ?? 'form')] ??= i.message
      return { ok: false, error: e.issues[0]?.message ?? 'Invalid input.', fieldErrors }
    }
    console.error(e)
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
}
