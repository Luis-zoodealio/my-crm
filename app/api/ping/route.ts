import { NextResponse } from 'next/server'
import postgres from 'postgres'

async function pingDb(url: string) {
  const sql = postgres(url, { prepare: false, max: 1 })
  await sql`SELECT 1`
  await sql.end()
}

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<string, string> = {}

  if (process.env.DATABASE_URL) {
    await pingDb(process.env.DATABASE_URL)
    results.dev = 'ok'
  }

  if (process.env.DATABASE_URL_PROD_PING) {
    await pingDb(process.env.DATABASE_URL_PROD_PING)
    results.prod = 'ok'
  }

  return NextResponse.json({ ok: true, pinged: results })
}
