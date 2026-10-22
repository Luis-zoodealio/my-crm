import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

type Db = ReturnType<typeof drizzle<typeof schema>>

// Reuse one client across dev HMR reloads. prepare:false is required for the
// Supabase transaction pooler.
const globalForDb = globalThis as unknown as { __db?: Db }

function connect(): Db {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL is not set. Add the Supabase pooled connection string to .env.local.')
  }
  return drizzle(postgres(url, { prepare: false, max: 10 }), { schema })
}

// Connects on first use so `next build` works without database credentials.
export const db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = (globalForDb.__db ??= connect())
    const value = Reflect.get(real, prop, real)
    return typeof value === 'function' ? value.bind(real) : value
  },
})
