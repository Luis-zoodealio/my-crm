import { eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { savedViews, userSettings } from '@/lib/db/schema'
import { DEFAULT_VIEWS } from '@/lib/views'

export type UserSettings = { staleDays: number; timezone: string }

/**
 * Settings for the signed-in user, creating them (and the four default saved views) on first visit.
 * Runs on every request, so the common case is exactly one query.
 */
export async function ensureUserSetup(userId: string): Promise<UserSettings> {
  const [row] = await db.execute(sql`
    select s.stale_days, s.timezone,
           (select count(*)::int from crm.saved_views v where v.user_id = s.user_id) as views
      from crm.user_settings s
     where s.user_id = ${userId}`)
  if (row && Number(row.views) > 0) return { staleDays: Number(row.stale_days), timezone: row.timezone as string }

  await db.insert(userSettings).values({ userId }).onConflictDoNothing()
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(savedViews).where(eq(savedViews.userId, userId))
  if (n === 0) {
    await db
      .insert(savedViews)
      .values(DEFAULT_VIEWS.map((v, position) => ({ userId, position, ...v })))
      .onConflictDoNothing()
  }
  const [s] = await db.select().from(userSettings).where(eq(userSettings.userId, userId))
  return { staleDays: s.staleDays, timezone: s.timezone }
}
