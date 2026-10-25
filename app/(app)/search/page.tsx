import { requireUser } from '@/lib/auth'
import { search } from '@/lib/queries/search'
import { SearchView } from './SearchView'

export const metadata = { title: 'Search · Zoodealio CRM' }

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  const sp = await searchParams
  const q = typeof sp.q === 'string' ? sp.q : ''
  const user = await requireUser()
  const results = q.trim() ? await search(user.id, q) : { deals: [], agents: [] }
  return <SearchView q={q} results={results} />
}
