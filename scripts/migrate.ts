import { config } from 'dotenv'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import postgres from 'postgres'

config({ path: '.env.local' })

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set in .env.local')

  const sql = postgres(url, { max: 1, onnotice: () => {} })
  try {
    await sql`create schema if not exists crm`
    await sql`create table if not exists crm.schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )`
    const done = new Set((await sql`select name from crm.schema_migrations`).map((r) => r.name))

    const dir = join(process.cwd(), 'db', 'migrations')
    const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
    for (const file of files) {
      if (done.has(file)) {
        console.log(`skip   ${file}`)
        continue
      }
      await sql.begin(async (tx) => {
        await tx.unsafe(readFileSync(join(dir, file), 'utf8'))
        await tx`insert into crm.schema_migrations (name) values (${file})`
      })
      console.log(`apply  ${file}`)
    }
  } finally {
    await sql.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
