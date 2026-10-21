import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { LAST_ACTIVE_STAGE } from '@/lib/stages'

/** Sidebar badges: active deal count and open task count. */
export async function getNavCounts(userId: string) {
  const [row] = await db.execute(sql`
    select
      (select count(*)::int from crm.deals where user_id = ${userId} and stage <= ${LAST_ACTIVE_STAGE}) as leads,
      (select count(*)::int from crm.tasks where user_id = ${userId} and not done) as tasks`)
  return { leads: Number(row.leads), tasks: Number(row.tasks) }
}
