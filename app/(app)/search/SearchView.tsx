import Link from 'next/link'
import { LeadPill } from '@/components/LeadPill'
import { fullAddress } from '@/lib/format'
import type { SearchResults } from '@/lib/queries/search'
import { STAGES } from '@/lib/stages'

export function SearchView({ q, results }: { q: string; results: SearchResults }) {
  const hasResults = results.deals.length > 0 || results.agents.length > 0

  return (
    <>
      <h1 className="text-2xl font-bold tracking-[-0.03em]">Search</h1>

      <div className="flex flex-col gap-6">
        {!q.trim() && (
          <p className="text-[15px] text-gray-500">Use the search bar above to find properties or agents.</p>
        )}
        {q.trim() && !hasResults && (
          <p className="text-[15px] text-gray-500">No results for &ldquo;{q.trim()}&rdquo;.</p>
        )}

        {results.deals.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-[13px] font-bold uppercase tracking-[.04em] text-gray-500">Properties</h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
              {results.deals.map((d) => (
                <Link
                  key={d.id}
                  href={`/deals/${d.id}?from=search`}
                  className="flex flex-col gap-2 rounded-xl border border-border bg-white p-4 text-ink shadow-sm hover:border-magenta hover:text-ink"
                >
                  <div className="flex items-center justify-between gap-2">
                    <LeadPill status={d.leadStatus} />
                    <span className="text-xs text-gray-500">{STAGES[d.stage].name}</span>
                  </div>
                  <span className="text-[15px] font-bold leading-snug">{fullAddress(d)}</span>
                  {d.agentName && <span className="text-[13px] text-gray-500">{d.agentName}</span>}
                </Link>
              ))}
            </div>
          </section>
        )}

        {results.agents.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-[13px] font-bold uppercase tracking-[.04em] text-gray-500">Agents</h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
              {results.agents.map((a) => (
                <Link
                  key={a.id}
                  href={`/agents/${a.id}`}
                  className="flex flex-col gap-1.5 rounded-xl border border-border bg-white p-4 text-ink shadow-sm hover:border-magenta hover:text-ink"
                >
                  <span className="text-[15px] font-bold">{a.name}</span>
                  {a.agency && <span className="text-[13px] text-gray-500">{a.agency}</span>}
                  <span className="text-[13px] text-gray-500">
                    {a.dealCount} {a.dealCount === 1 ? 'deal' : 'deals'}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  )
}
