import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await db.execute(sql`SELECT 1`)
  return NextResponse.json({ ok: true })
}
