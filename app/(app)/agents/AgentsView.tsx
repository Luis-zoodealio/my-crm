'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { Button } from '@/components/Button'
import type { AgentCard } from '@/lib/agents/query'
import { compactMoney } from '@/lib/format'

export function AgentsView({ agents, total, q, page, pageSize }: { agents: AgentCard[]; total: number; q: string; page: number; pageSize: number }) {
  const router = useRouter()
  const [value, setValue] = useState(q)
  const [pending, start] = useTransition()
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const href = (query: string, p = 1) => {
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query)
    if (p > 1) params.set('page', String(p))
    return `/agents${params.size ? `?${params}` : ''}`
  }

  // Server-side search, debounced so typing doesn't fire a request per keystroke.
  useEffect(() => {
    if (value === q) return
    const t = setTimeout(() => start(() => router.replace(href(value))), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const searching = q.trim() !== ''

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-[-0.03em]">
          Agents <span className="ml-1.5 text-sm font-medium tracking-normal text-gray-500">{total.toLocaleString('en-US')}</span>
        </h1>
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={100}
          aria-label="Search agents"
          placeholder="Search agent name or property address"
          className="w-[min(420px,100%)] rounded-md border border-border bg-white px-3.5 py-[11px] text-sm outline-none focus:border-magenta"
        />
      </div>

      {agents.length === 0 ? (
        <p className="text-[15px] text-gray-500">
          {searching ? 'No agents or properties match that search.' : 'No agents yet. Agents are created when you add a deal.'}
        </p>
      ) : (
        <div className={`grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 transition-opacity ${pending ? 'opacity-60' : ''}`} aria-busy={pending}>
          {agents.map((a) => (
            <Link
              key={a.id}
              href={`/agents/${a.id}`}
              className="flex flex-col gap-3 rounded-xl border border-border bg-white p-5 text-ink shadow-sm hover:border-magenta hover:text-ink"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-lg font-bold">{a.name}</span>
                {a.agency && <span className="text-sm text-gray-500">{a.agency}</span>}
              </div>
              {a.matches.map((m) => (
                <span key={m} className="text-[13px] font-semibold text-magenta">{m}</span>
              ))}
              <div className="flex items-baseline justify-between border-t border-border pt-3">
                <span className="text-[13px] text-gray-500">{a.dealCount} {a.dealCount === 1 ? 'deal' : 'deals'}</span>
                <span className="text-lg font-extrabold tracking-[-0.03em]">{compactMoney(a.totalOffers)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {total > pageSize && (
        <nav aria-label="Pagination" className="flex items-center justify-between gap-3 text-sm text-gray-700">
          <span>Showing {((page - 1) * pageSize + 1).toLocaleString('en-US')}–{((page - 1) * pageSize + agents.length).toLocaleString('en-US')} of {total.toLocaleString('en-US')}</span>
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-gray-500">Page {page} of {pageCount.toLocaleString('en-US')}</span>
            <Button variant="outline" size="xs" disabled={page <= 1 || pending} onClick={() => start(() => router.push(href(q, page - 1)))}>Previous</Button>
            <Button variant="outline" size="xs" disabled={page >= pageCount || pending} onClick={() => start(() => router.push(href(q, page + 1)))}>Next</Button>
          </div>
        </nav>
      )}
    </>
  )
}
