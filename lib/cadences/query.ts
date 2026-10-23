import 'server-only'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { cadences } from '@/lib/db/schema'

export type CadenceStep = { days: number; method: string }
export type Cadence = { id: string; name: string; steps: CadenceStep[] }

export async function listCadences(userId: string): Promise<Cadence[]> {
  const rows = await db.select().from(cadences).where(eq(cadences.userId, userId)).orderBy(asc(cadences.position), asc(cadences.createdAt))
  return rows.map((c) => ({ id: c.id, name: c.name, steps: (c.steps as CadenceStep[]) ?? [] }))
}
