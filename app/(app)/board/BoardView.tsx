'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { Button, ButtonLink } from '@/components/Button'
import { LeadPill } from '@/components/LeadPill'
import { loadBoardColumn } from '@/lib/board/actions'
import type { BoardCard, BoardColumn } from '@/lib/board/query'
import { compactMoney, fullAddress, lastContactLabel } from '@/lib/format'
import { LAST_ACTIVE_STAGE, STAGES } from '@/lib/stages'

export function BoardView({ columns, staleDays }: { columns: BoardColumn[]; staleDays: number }) {
  const totalDeals = columns.reduce((n, c) => n + c.total, 0)

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-[-0.03em]">Board</h1>
        <span className="text-sm text-gray-500">12 stages. Scroll sideways.</span>
      </div>

      {totalDeals === 0 ? (
        <div className="flex max-w-[520px] flex-col items-start gap-3 rounded-xl border border-border bg-white p-6 shadow-sm">
          <span className="text-lg font-bold">No deals on the board yet</span>
          <p className="text-[15px] leading-normal text-gray-700">Add a deal and it appears in the column for its stage.</p>
          <ButtonLink href="/deals/new">+ Add deal</ButtonLink>
        </div>
      ) : (
        <div className="flex items-start gap-3.5 overflow-x-auto pb-3">
          {columns.map((col) => (
            // Remount when the server data changes so loaded-more cards never go stale.
            <Column key={`${col.stage}:${col.total}:${col.cards.map((c) => c.id.slice(0, 6)).join('')}`} column={col} staleDays={staleDays} />
          ))}
        </div>
      )}
    </>
  )
}

function Column({ column, staleDays }: { column: BoardColumn; staleDays: number }) {
  const [extra, setExtra] = useState<BoardCard[]>([])
  const [total, setTotal] = useState(column.total)
  const [error, setError] = useState('')
  const [pending, start] = useTransition()
  const stage = STAGES[column.stage]

  const seen = new Set(column.cards.map((c) => c.id))
  const cards = [...column.cards, ...extra.filter((c) => !seen.has(c.id))]
  const remaining = total - cards.length

  function loadMore() {
    setError('')
    start(async () => {
      const res = await loadBoardColumn(column.stage, cards.length)
      if (!res.ok) return setError(res.error)
      setTotal(res.total)
      setExtra((e) => [...e, ...res.cards])
    })
  }

  return (
    <section className={`flex w-[252px] flex-none flex-col gap-2.5 ${column.stage === 11 ? 'opacity-60' : ''}`} aria-label={`${stage.name}, ${total} deals`}>
      <div className="flex items-center justify-between gap-2 px-0.5">
        <h2 className="text-xs font-bold uppercase leading-[1.2] tracking-[.03em]">{stage.name}</h2>
        <span className="rounded-full bg-bg-warm px-2 py-0.5 text-xs font-bold text-gray-500">{total}</span>
      </div>
      <div className="h-[3px] rounded-[3px]" style={{ background: stage.color }} />

      {cards.length === 0 && <p className="px-0.5 text-[13px] text-gray-500">No deals in this stage.</p>}
      {cards.map((d) => {
        const stale = d.stage <= LAST_ACTIVE_STAGE && d.daysSinceContact >= staleDays
        return (
          <Link
            key={d.id}
            href={`/deals/${d.id}?from=board`}
            className="flex flex-col gap-2.5 rounded-[14px] border border-border bg-white p-3.5 text-ink shadow-sm hover:border-magenta hover:text-ink"
          >
            <div className="flex items-center justify-between">
              <LeadPill status={d.leadStatus} />
              <span className={`text-xs ${stale ? 'font-bold text-[#b45309]' : 'font-medium text-gray-500'}`}>
                {lastContactLabel(d.daysSinceContact, stale)}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[15px] font-bold tracking-[-0.01em]">{fullAddress(d)}</span>
              <span className="text-[13px] text-gray-500">{d.agentName ?? 'No agent'}</span>
            </div>
            <div>
              {d.followUps >= 1 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#fbe6f0] px-2 py-0.5 text-xs font-bold text-magenta">
                  ↻ {d.followUps} follow-up{d.followUps === 1 ? '' : 's'}
                </span>
              ) : d.firstContactMade ? (
                <span className="text-xs text-gray-400">No follow-ups yet</span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#b45309]">
                  <span className="size-1.5 rounded-full bg-[#b45309]" />
                  Needs first contact
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1 border-t border-border pt-2.5">
              <span className="text-xs text-gray-500">Offers</span>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-gray-500">Cash</span>
                <span className="text-base font-extrabold tracking-[-0.03em]">{compactMoney(d.cashOffer)}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-gray-500">Cash+</span>
                <span className="text-base font-extrabold tracking-[-0.03em]">{compactMoney(d.cashPlusOffer)}</span>
              </div>
            </div>
          </Link>
        )
      })}

      {remaining > 0 && (
        <Button variant="outline" size="xs" onClick={loadMore} disabled={pending}>
          {pending ? 'Loading…' : `Load ${Math.min(remaining, 50)} more (${remaining} left)`}
        </Button>
      )}
      {error && <p role="alert" className="text-[13px] text-magenta-bright">{error}</p>}
    </section>
  )
}
