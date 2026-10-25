'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { SearchResults } from '@/lib/queries/search'
import { STAGES } from '@/lib/stages'

const LIMIT = 3

function addr(d: { address: string; city: string | null; state: string | null }) {
  return [d.address, d.city, d.state].filter(Boolean).join(', ')
}

export function GlobalSearch() {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const q = value.trim()
    if (q.length < 2) {
      setResults(null)
      setOpen(false)
      return
    }

    const t = setTimeout(async () => {
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl

      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        if (!res.ok) return
        const data: SearchResults = await res.json()
        setResults(data)
        setOpen(true)
      } catch (e) {
        if ((e as Error).name !== 'AbortError') console.error(e)
      }
    }, 300)

    return () => clearTimeout(t)
  }, [value])

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    setValue('')
  }, [])

  const deals = (results?.deals ?? []).slice(0, LIMIT)
  const agents = (results?.agents ?? []).slice(0, LIMIT)
  const hasResults = deals.length > 0 || agents.length > 0
  const showDropdown = open && value.trim().length >= 2

  return (
    <div ref={containerRef} className="relative w-[min(300px,100%)]">
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { setOpen(false); setValue('') }
          if (e.key === 'Enter' && value.trim()) {
            setOpen(false)
            router.push(`/search?q=${encodeURIComponent(value.trim())}`)
          }
        }}
        maxLength={100}
        aria-label="Search properties or agents"
        placeholder="Search properties or agents…"
        className="w-full rounded-md border border-border bg-white px-3 py-1.5 text-sm outline-none focus:border-magenta"
      />

      {showDropdown && (
        <div className="absolute right-0 top-full z-50 mt-1 w-[380px] rounded-xl border border-border bg-white shadow-lg">
          {!hasResults && (
            <p className="px-4 py-3 text-sm text-gray-400">No results for &ldquo;{value.trim()}&rdquo;</p>
          )}

          {deals.length > 0 && (
            <section>
              <p className="px-4 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Properties
              </p>
              {deals.map((d) => (
                <Link
                  key={d.id}
                  href={`/deals/${d.id}?from=search`}
                  onClick={close}
                  className="flex flex-col gap-0.5 px-4 py-2.5 hover:bg-gray-50"
                >
                  <span className="text-sm font-semibold leading-snug text-ink">{addr(d)}</span>
                  <span className="text-xs text-gray-400">
                    {d.agentName ?? '—'} · {STAGES[d.stage].name}
                  </span>
                </Link>
              ))}
            </section>
          )}

          {agents.length > 0 && (
            <section className={deals.length > 0 ? 'border-t border-border' : ''}>
              <p className="px-4 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Agents
              </p>
              {agents.map((a) => (
                <Link
                  key={a.id}
                  href={`/agents/${a.id}`}
                  onClick={close}
                  className="flex flex-col gap-0.5 px-4 py-2.5 hover:bg-gray-50"
                >
                  <span className="text-sm font-semibold text-ink">{a.name}</span>
                  <span className="text-xs text-gray-400">
                    {a.dealCount} {a.dealCount === 1 ? 'deal' : 'deals'}
                  </span>
                </Link>
              ))}
            </section>
          )}

          {hasResults && (
            <div className="border-t border-border px-4 py-2.5">
              <Link
                href={`/search?q=${encodeURIComponent(value.trim())}`}
                onClick={close}
                className="text-sm font-medium text-magenta hover:underline"
              >
                View full results →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
