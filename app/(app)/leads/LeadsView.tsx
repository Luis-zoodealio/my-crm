'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { Button, ButtonLink } from '@/components/Button'
import { LeadPill } from '@/components/LeadPill'
import { bulkUpdateDeals, deleteView, saveView, updateView } from '@/lib/leads/actions'
import { FIELD_KEYS, FIELDS, MAX_RULES, newRule, OPS, PAGE_SIZE, SORT_KEYS, SORTS, enumOptions, sameSpec, type FieldKey, type SortKey } from '@/lib/leads/spec'
import type { LeadRow, OpenTaskItem, QueueItem } from '@/lib/leads/query'
import { fullAddress, money } from '@/lib/format'
import { STAGES } from '@/lib/stages'
import type { Rule, Sort, ViewSpec } from '@/lib/views'

type Draft = { rules: Rule[]; sorts: Sort[]; view: string | null }

type Props = {
  leads: LeadRow[]
  total: number
  totalDeals: number
  queue: QueueItem[]
  openTasks: OpenTaskItem[]
  agents: { id: string; label: string }[]
  views: ViewSpec[]
  rules: Rule[]
  sorts: Sort[]
  activeView: string | null
  dirty: boolean
  page: number
  staleDays: number
}

const selectClass = 'rounded-sm border border-border bg-white px-2.5 py-2 text-sm text-ink'
const inputClass = 'rounded-sm border border-border bg-white px-2.5 py-2 text-sm'

function hrefFor(d: Draft, views: ViewSpec[], page = 1) {
  const v = views.find((x) => x.name === d.view)
  const q = new URLSearchParams()
  if (d.view) q.set('view', d.view)
  if (!(v && sameSpec(v, d))) {
    q.set('f', JSON.stringify(d.rules))
    q.set('s', JSON.stringify(d.sorts))
  }
  if (page > 1) q.set('page', String(page))
  return `/leads?${q}`
}

export function LeadsView(props: Props) {
  const { leads, total, totalDeals, queue, openTasks, agents, views, page } = props
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const propsDraft: Draft = { rules: props.rules, sorts: props.sorts, view: props.activeView }
  const propsSig = JSON.stringify([propsDraft, page])
  const [draft, setDraft] = useState<Draft>(propsDraft)
  const [panel, setPanel] = useState(false)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [viewName, setViewName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Server state changed (view link, back button, applied edit): adopt it and clear the selection.
  const lastProps = useRef(propsSig)
  useEffect(() => {
    if (lastProps.current === propsSig) return
    lastProps.current = propsSig
    setDraft(propsDraft)
    setSel(new Set())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propsSig])

  // Push draft edits to the URL (debounced so typing doesn't fire a request per keystroke).
  const draftSig = JSON.stringify(draft)
  useEffect(() => {
    if (draftSig === JSON.stringify(propsDraft)) return
    const t = setTimeout(() => startTransition(() => router.replace(hrefFor(draft, views))), 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftSig])

  const edit = (fn: (d: Draft) => Draft) => setDraft(fn)
  const setRules = (fn: (r: Rule[]) => Rule[]) => edit((d) => ({ ...d, rules: fn(d.rules) }))
  const setSorts = (fn: (s: Sort[]) => Sort[]) => edit((d) => ({ ...d, sorts: fn(d.sorts) }))

  const activeSpec = views.find((v) => v.name === draft.view)
  const dirty = !!activeSpec && !sameSpec(activeSpec, draft)

  const go = (href: string) => startTransition(() => router.push(href))

  function applyView(v: ViewSpec) {
    setDraft({ rules: v.rules, sorts: v.sorts, view: v.name })
    setSel(new Set())
    go(hrefFor({ rules: v.rules, sorts: v.sorts, view: v.name }, views))
  }

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) {
    setBusy(true)
    setError('')
    const res = await fn()
    setBusy(false)
    if (!res.ok) return setError(res.error ?? 'Something went wrong.')
    after?.()
    router.refresh()
  }

  const saveNew = () =>
    run(
      () => saveView({ name: viewName, rules: draft.rules, sorts: draft.sorts }),
      () => {
        const name = viewName.trim()
        setViewName('')
        setDraft({ ...draft, view: name })
        go(`/leads?view=${encodeURIComponent(name)}`)
      },
    )
  const doUpdate = () =>
    run(() => updateView(draft.view!, draft), () => go(`/leads?view=${encodeURIComponent(draft.view!)}`))
  const removeView = (name: string) =>
    run(() => deleteView(name), () => {
      if (draft.view === name) {
        setDraft({ ...draft, view: null })
        go(hrefFor({ ...draft, view: null }, views))
      }
    })
  const bulk = (action: 'next-stage' | 'mark-hot') =>
    run(() => bulkUpdateDeals({ ids: [...sel], action }), () => setSel(new Set()))

  // Column header sort: replaces the sort list with this one column, toggling direction.
  const sortBy = (k: SortKey) =>
    edit((d) => {
      const c = d.sorts[0]
      return { ...d, sorts: [{ k, dir: c && c.k === k && c.dir === 'asc' ? 'desc' : 'asc' }] }
    })
  const head = (label: string, k: SortKey) => {
    const c = draft.sorts[0]
    const active = c && c.k === k
    return (
      <div role="columnheader" aria-sort={active ? (c.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
        <button type="button" onClick={() => sortBy(k)} className="cursor-pointer text-left uppercase">
          {label + (active ? (c.dir === 'asc' ? ' ↑' : ' ↓') : ' ↕')}
        </button>
      </div>
    )
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const to = (page - 1) * PAGE_SIZE + leads.length
  const gridCols = 'grid-cols-[24px_90px_minmax(0,1.7fr)_minmax(0,1.4fr)_110px_150px]'
  const allOnPage = leads.length > 0 && leads.every((l) => sel.has(l.id))
  const rowIds = useMemo(() => leads.map((l) => l.id), [leads])

  return (
    <div className="grid grid-cols-1 gap-5 min-[1400px]:h-[calc(100vh-5rem)] min-[1400px]:grid-cols-[minmax(0,1fr)_320px]">
      <section className="flex min-h-0 flex-col gap-4 rounded-xl border border-border bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-[-0.03em]">
            Leads{' '}
            <span className="ml-1.5 text-sm font-medium tracking-normal text-gray-500">
              {total.toLocaleString('en-US')} of {totalDeals.toLocaleString('en-US')} deals
            </span>
          </h1>
          <button
            type="button"
            onClick={() => setPanel((p) => !p)}
            aria-expanded={panel}
            className={`cursor-pointer rounded-md border border-border px-3.5 py-2 text-[13px] font-bold ${panel ? 'bg-ink text-white' : 'bg-white text-ink'}`}
          >
            Filters ({draft.rules.length}) · Sort ({draft.sorts.length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[13px] font-medium">
          <span className="py-[7px] text-gray-500">Saved views</span>
          {views.map((v) => {
            const on = draft.view === v.name
            return (
              <span key={v.name} className={`inline-flex items-center gap-1.5 rounded-full py-[7px] pl-[13px] pr-2 ${on ? 'bg-ink text-white' : 'bg-bg-warm text-gray-700'}`}>
                <button type="button" onClick={() => applyView(v)} className="cursor-pointer">{v.name}</button>
                <button type="button" onClick={() => removeView(v.name)} title="Delete view" aria-label={`Delete view ${v.name}`} disabled={busy} className="cursor-pointer px-1 text-base leading-none opacity-60 hover:opacity-100">×</button>
              </span>
            )
          })}
        </div>

        {panel && (
          <div className="flex flex-col gap-[18px] rounded-[14px] border border-border bg-bg p-[18px]">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] font-bold uppercase tracking-[.04em]">Filters</span>
                <span className="text-[13px] text-gray-500">Deals must match all</span>
              </div>
              {draft.rules.length === 0 && <span className="text-sm text-gray-500">No filters. Showing every deal.</span>}
              {draft.rules.map((r, i) => {
                const f = FIELDS[r.field as FieldKey]
                const opts = enumOptions(r.field as FieldKey, agents)
                const patch = (p: Partial<Rule>) => setRules((rs) => rs.map((x, j) => (j === i ? { ...x, ...p } : x)))
                return (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <select aria-label="Filter field" value={r.field} onChange={(e) => setRules((rs) => rs.map((x, j) => (j === i ? newRule(e.target.value as FieldKey, agents) : x)))} className={selectClass}>
                      {FIELD_KEYS.map((k) => <option key={k} value={k}>{FIELDS[k].label}</option>)}
                    </select>
                    <select aria-label="Filter operator" value={r.op} onChange={(e) => patch({ op: e.target.value })} className={selectClass}>
                      {OPS[f.type].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    {f.type === 'enum' ? (
                      <select aria-label="Filter value" value={r.value} onChange={(e) => patch({ value: e.target.value })} className={selectClass}>
                        {opts.length === 0 && <option value="">No options</option>}
                        {opts.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                      </select>
                    ) : (
                      <input aria-label="Filter value" type={f.type === 'num' ? 'number' : 'text'} value={r.value} onChange={(e) => patch({ value: e.target.value })} placeholder={f.type === 'text' ? 'Search' : 'Value'} className={`${inputClass} w-[150px]`} />
                    )}
                    {f.unit && <span className="text-[13px] text-gray-500">{f.unit}</span>}
                    <button type="button" onClick={() => setRules((rs) => rs.filter((_, j) => j !== i))} aria-label="Remove filter" className="cursor-pointer px-1.5 text-lg text-gray-500">×</button>
                  </div>
                )
              })}
              {draft.rules.length < MAX_RULES && (
                <button type="button" onClick={() => setRules((rs) => [...rs, newRule('temp', agents)])} className="w-fit cursor-pointer text-sm font-bold text-magenta">+ Add filter</button>
              )}
            </div>

            <div className="flex flex-col gap-2.5 border-t border-border pt-4">
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] font-bold uppercase tracking-[.04em]">Sort</span>
                <span className="text-[13px] text-gray-500">Applied in order. You can also click a column header.</span>
              </div>
              {draft.sorts.length === 0 && <span className="text-sm text-gray-500">No sorting.</span>}
              {draft.sorts.map((s, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <span className="w-[52px] text-[13px] text-gray-500">{i === 0 ? 'Sort by' : 'Then by'}</span>
                  <select aria-label="Sort field" value={s.k} onChange={(e) => setSorts((ss) => ss.map((x, j) => (j === i ? { ...x, k: e.target.value } : x)))} className={selectClass}>
                    {SORT_KEYS.map((k) => <option key={k} value={k}>{SORTS[k].label}</option>)}
                  </select>
                  <button type="button" onClick={() => setSorts((ss) => ss.map((x, j) => (j === i ? { ...x, dir: x.dir === 'asc' ? 'desc' : 'asc' } : x)))} className="cursor-pointer rounded-sm border border-border bg-white px-3 py-2 text-sm">
                    {SORTS[s.k as SortKey]?.dirLabels[s.dir === 'asc' ? 0 : 1]}
                  </button>
                  <button type="button" onClick={() => setSorts((ss) => ss.filter((_, j) => j !== i))} aria-label="Remove sort" className="cursor-pointer px-1.5 text-lg text-gray-500">×</button>
                </div>
              ))}
              {draft.sorts.length < SORT_KEYS.length && (
                <button type="button" onClick={() => setSorts((ss) => [...ss, { k: SORT_KEYS.find((k) => !ss.some((s) => s.k === k)) ?? 'days', dir: 'desc' }])} className="w-fit cursor-pointer text-sm font-bold text-magenta">+ Add sort</button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 border-t border-border pt-4">
              <input type="text" value={viewName} onChange={(e) => setViewName(e.target.value)} maxLength={60} placeholder="Name this view" aria-label="View name" className={`${inputClass} w-[200px] px-3 py-[9px]`} />
              <Button size="xs" onClick={saveNew} disabled={busy || !viewName.trim()}>Save as new view</Button>
              {dirty && <Button size="xs" variant="outline" onClick={doUpdate} disabled={busy}>Update &ldquo;{draft.view}&rdquo;</Button>}
              <button type="button" onClick={() => setDraft({ rules: [], sorts: [], view: null })} className="ml-auto cursor-pointer text-sm text-gray-500">Clear all</button>
              {error && <p role="alert" className="basis-full text-sm text-magenta-bright">{error}</p>}
            </div>
          </div>
        )}

        {sel.size > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-lg bg-charcoal px-3.5 py-2.5 text-sm text-white">
            <span className="font-semibold">{sel.size} selected</span>
            <div className="flex gap-2">
              <button type="button" disabled={busy} onClick={() => bulk('next-stage')} className="cursor-pointer rounded-sm bg-white/10 px-3 py-1.5 disabled:opacity-60">Move to next stage</button>
              <button type="button" disabled={busy} onClick={() => bulk('mark-hot')} className="cursor-pointer rounded-sm bg-magenta px-3 py-1.5 font-bold disabled:opacity-60">Mark hot</button>
              <button type="button" onClick={() => setSel(new Set())} className="cursor-pointer rounded-sm bg-white/10 px-3 py-1.5">Clear</button>
            </div>
          </div>
        )}
        {!panel && error && <p role="alert" className="text-sm text-magenta-bright">{error}</p>}

        <div className="max-h-[70vh] overflow-auto min-[1400px]:max-h-none min-[1400px]:min-h-0 min-[1400px]:flex-1">
          <div role="table" aria-label="Leads" aria-rowcount={leads.length + 1} className={`min-w-[700px] transition-opacity ${pending ? 'opacity-60' : ''}`} aria-busy={pending}>
            <div role="row" className={`sticky top-0 z-10 grid ${gridCols} gap-3 border-b border-border bg-white px-3 py-2.5 text-xs font-semibold uppercase tracking-[.04em] text-gray-500`}>
              <div role="columnheader" aria-label="Select">
                <input type="checkbox" aria-label="Select all on this page" checked={allOnPage} onChange={() => setSel(allOnPage ? new Set() : new Set(rowIds))} className="size-[18px] accent-[#ac0a55]" />
              </div>
              {head('Lead', 'temp')}
              {head('Property / agent', 'addr')}
              {head('Stage', 'stage')}
              {head('Last contact', 'days')}
              {head('Offers', 'offer')}
            </div>

            {leads.length === 0 ? (
              <div role="row"><div role="cell" aria-colspan={6} className="flex flex-col items-start gap-3 px-3 py-10">
                {totalDeals === 0 ? (
                  <>
                    <span className="text-lg font-bold">No leads yet</span>
                    <p className="max-w-[420px] text-[15px] text-gray-700">Add your first deal to start working your pipeline.</p>
                    <ButtonLink href="/deals/new">+ Add deal</ButtonLink>
                  </>
                ) : (
                  <>
                    <span className="text-lg font-bold">No deals match these filters</span>
                    <p className="text-[15px] text-gray-700">Try removing a filter, or start over.</p>
                    <Button variant="outline" size="xs" onClick={() => { setDraft({ rules: [], sorts: [], view: null }); setPanel(true) }}>Clear all</Button>
                  </>
                )}
              </div></div>
            ) : (
              leads.map((d) => {
                const stale = d.stage <= 9 && d.daysSinceContact >= props.staleDays
                const on = sel.has(d.id)
                return (
                  <div key={d.id} role="row" aria-selected={on} className={`grid ${gridCols} items-center gap-3 border-b border-border px-3 py-[13px] ${on ? 'bg-[#fdf4f8]' : ''}`}>
                    <div role="cell">
                      <input type="checkbox" aria-label={`Select ${d.address}`} checked={on} onChange={() => setSel((s) => { const n = new Set(s); if (on) n.delete(d.id); else n.add(d.id); return n })} className="size-[18px] accent-[#ac0a55]" />
                    </div>
                    <div role="cell"><LeadPill status={d.leadStatus} /></div>
                    <div role="cell" className="min-w-0">
                      <Link href={`/deals/${d.id}?from=leads`} className="flex min-w-0 flex-col gap-0.5 text-ink hover:text-ink">
                        <span className="text-[15px] font-bold">{fullAddress(d)}</span>
                        <span className="text-[13px] text-gray-500">{d.agentName ?? 'No agent'}</span>
                      </Link>
                      {d.openTasks > 0 && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#fff4e5] px-2 py-0.5 text-[11px] font-bold text-[#b45309]">
                          <span className="size-1.5 rounded-full bg-[#b45309]" />
                          {d.openTasks} open task{d.openTasks === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>
                    <div role="cell" className="text-sm text-gray-700">{STAGES[d.stage].name}</div>
                    <div role="cell" className="text-[13px]">
                      <span className={stale ? 'font-bold text-[#b45309]' : 'font-medium text-gray-500'}>
                        {d.daysSinceContact === 0 ? 'Today' : stale ? `${d.daysSinceContact}d, stale` : `${d.daysSinceContact}d ago`}
                      </span>
                      {d.followUps >= 1 ? (
                        <span className="mt-0.5 block text-xs font-bold text-magenta">↻ {d.followUps} follow-up{d.followUps === 1 ? '' : 's'}</span>
                      ) : d.firstContactMade ? (
                        <span className="mt-0.5 block text-xs font-medium text-gray-400">No follow-ups</span>
                      ) : (
                        <span className="mt-0.5 block text-xs font-bold text-[#b45309]">Needs first contact</span>
                      )}
                    </div>
                    <div role="cell" className="flex flex-col gap-0.5 text-[13px]">
                      <div className="flex justify-between gap-2"><span className="text-gray-500">Cash</span><span className="font-extrabold tracking-[-0.02em]">{money(d.cashOffer)}</span></div>
                      <div className="flex justify-between gap-2"><span className="text-gray-500">Cash+</span><span className="font-extrabold tracking-[-0.02em]">{money(d.cashPlusOffer)}</span></div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {total > PAGE_SIZE && (
          <nav aria-label="Pagination" className="flex items-center justify-between gap-3 text-sm text-gray-700">
            <span>Showing {from.toLocaleString('en-US')}–{to.toLocaleString('en-US')} of {total.toLocaleString('en-US')}</span>
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-gray-500">Page {page} of {pageCount.toLocaleString('en-US')}</span>
              <Button variant="outline" size="xs" disabled={page <= 1 || pending} onClick={() => go(hrefFor(draft, views, page - 1))}>Previous</Button>
              <Button variant="outline" size="xs" disabled={page >= pageCount || pending} onClick={() => go(hrefFor(draft, views, page + 1))}>Next</Button>
            </div>
          </nav>
        )}
      </section>

      <div className="flex min-h-0 flex-col gap-5">
        <aside className="flex flex-col gap-3 rounded-xl border border-border bg-white p-[22px]">
          <h2 className="text-lg font-bold tracking-[-0.02em]">Follow-up queue</h2>
          {queue.length === 0 && <p className="text-sm text-gray-500">No follow-ups due in the next 2 days.</p>}
          {queue.map((q) => {
            const when = q.days < 0 ? `Overdue ${-q.days}d` : q.days === 0 ? 'Today' : q.days === 1 ? 'Tomorrow' : 'In 2 days'
            const color = q.days < 0 ? '#e11d74' : q.days === 0 ? '#ac0a55' : '#b45309'
            return (
              <Link key={q.dealId} href={`/deals/${q.dealId}?from=leads`} className="flex flex-col gap-1.5 rounded-lg bg-bg p-3.5 text-ink hover:text-ink">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold" style={{ color }}>{when}</span>
                  <span className="text-xs text-gray-500">{q.method}</span>
                </div>
                <span className="text-[15px] font-bold">{fullAddress(q)}</span>
                <span className="text-[13px] leading-[1.4] text-gray-700">{q.title}</span>
              </Link>
            )
          })}
        </aside>

        <aside className="flex min-h-0 flex-col gap-3 rounded-xl border border-border bg-white p-[22px] min-[1400px]:flex-1">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-bold tracking-[-0.02em]">Open tasks</h2>
            <span className="text-[13px] font-semibold text-gray-500">{openTasks.length}</span>
          </div>
          {openTasks.length === 0 ? (
            <p className="text-sm text-gray-500">No open tasks right now.</p>
          ) : (
            <div className="flex max-h-[52vh] flex-col gap-2 overflow-y-auto min-[1400px]:max-h-none min-[1400px]:min-h-0 min-[1400px]:flex-1">
              {openTasks.map((t) => {
                const when = t.days < 0 ? `Overdue ${-t.days}d` : t.days === 0 ? 'Today' : t.days === 1 ? 'Tomorrow' : `In ${t.days}d`
                const color = t.days < 0 ? '#e11d74' : t.days === 0 ? '#ac0a55' : t.days <= 2 ? '#b45309' : '#71717a'
                return (
                  <Link key={t.id} href={`/deals/${t.dealId}?from=leads`} className="flex flex-col gap-1 rounded-lg bg-bg p-3 text-ink hover:text-ink">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold" style={{ color }}>{when}</span>
                      <span className="text-xs text-gray-500">{t.method} · {t.source}</span>
                    </div>
                    <span className="text-sm font-semibold leading-snug">{t.title}</span>
                    <span className="text-[13px] text-gray-500">{fullAddress(t)}</span>
                  </Link>
                )
              })}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
