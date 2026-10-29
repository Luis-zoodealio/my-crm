'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/Button'
import { ConfirmDialog } from '@/components/Modal'
import { OpenTasksList } from '@/components/OpenTasksList'
import { ScheduleModal } from '@/components/ScheduleModal'
import {
  addPropertyNote,
  completeTask,
  deleteNote,
  deletePropertyNote,
  logFollowUp,
  setEquityStatus,
  setLeadStatus,
  setStage,
  updateNote,
  updatePropertyNote,
  type Result,
} from '@/lib/deals/actions'
import { setDealCadence } from '@/lib/cadences/actions'
import type { DealTask, NoteItem, TimelineItem } from '@/lib/deals/query'
import { money } from '@/lib/format'
import { CONTACT_METHODS, EQUITY_STATUSES, LEAD_STATUS_COLORS, LEAD_STATUSES, STAGES, type LeadStatus } from '@/lib/stages'

/** Runs a server action in a transition and keeps its error message. */
function useAction() {
  const [pending, start] = useTransition()
  const [error, setError] = useState('')
  const run = (fn: () => Promise<Result>, onOk?: () => void) =>
    start(async () => {
      setError('')
      const res = await fn()
      if (!res.ok) setError(res.error)
      else onOk?.()
    })
  return { pending, error, run, setError }
}

const Err = ({ msg }: { msg: string }) => (msg ? <p role="alert" className="text-sm text-magenta-bright">{msg}</p> : null)

export function LeadStatusPills({ dealId, current }: { dealId: string; current: string }) {
  const { pending, error, run } = useAction()
  return (
    <>
      {LEAD_STATUSES.map((t) => {
        const c = LEAD_STATUS_COLORS[t as LeadStatus]
        return (
          <button
            key={t}
            type="button"
            disabled={pending}
            aria-pressed={current === t}
            onClick={() => current !== t && run(() => setLeadStatus(dealId, t))}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-[11px] py-1 text-xs font-bold"
            style={{ background: c.bg, color: c.fg, border: `1.5px solid ${current === t ? c.fg : 'transparent'}` }}
          >
            <span className="size-1.5 rounded-full" style={{ background: c.fg }} />
            {t}
          </button>
        )
      })}
      <Err msg={error} />
    </>
  )
}

export function StageBar({ dealId, stage }: { dealId: string; stage: number }) {
  const { pending, error, run } = useAction()
  return (
    <>
      <div className={`grid grid-cols-12 gap-1 ${pending ? 'opacity-60' : ''}`} role="group" aria-label="Deal stage">
        {STAGES.map((s, i) => (
          <button
            key={s.name}
            type="button"
            disabled={pending}
            aria-pressed={i === stage}
            aria-label={s.name}
            onClick={() => i !== stage && run(() => setStage(dealId, i))}
            className="flex cursor-pointer flex-col gap-1.5 text-left"
          >
            <div className="h-1.5 w-full rounded-[3px]" style={{ background: i <= stage ? (i === stage ? '#ac0a55' : '#e8a3c2') : '#e4e4e7' }} />
            <span className="text-[11px] leading-[1.2]" style={{ color: i === stage ? '#09090b' : '#71717a', fontWeight: i === stage ? 700 : 500 }}>
              {s.name}
            </span>
          </button>
        ))}
      </div>
      <Err msg={error} />
    </>
  )
}

function TypeChips({ value, onChange }: { value: string; onChange: (t: (typeof CONTACT_METHODS)[number]) => void }) {
  return (
    <div className="flex gap-1.5 text-[13px] font-medium" role="radiogroup" aria-label="Exchange type">
      {CONTACT_METHODS.map((t) => (
        <button key={t} type="button" role="radio" aria-checked={value === t} onClick={() => onChange(t)} className={`cursor-pointer rounded-full px-3 py-1.5 ${value === t ? 'bg-ink text-white' : 'bg-bg-warm text-gray-700'}`}>
          {t}
        </button>
      ))}
    </div>
  )
}

const inThreeDays = () => new Date(Date.now() + 3 * 864e5).toLocaleDateString('en-CA')

/**
 * One composer for the whole deal timeline: log a contact exchange (with optional
 * next-follow-up scheduling) or jot a property note — no separate sections.
 */
export function ActivityComposer({ dealId, hasContact, suggestion }: { dealId: string; hasContact: boolean; suggestion: { days: number; method: string; label: string } | null }) {
  const [mode, setMode] = useState<'exchange' | 'property'>('exchange')
  const [text, setText] = useState('')
  const [type, setType] = useState<(typeof CONTACT_METHODS)[number]>('Call')
  const [scheduleOn, setScheduleOn] = useState(true)
  const [date, setDate] = useState(() => (suggestion ? new Date(Date.now() + suggestion.days * 864e5).toLocaleDateString('en-CA') : inThreeDays()))
  const [time, setTime] = useState('09:00')
  const [nextMethod, setNextMethod] = useState<(typeof CONTACT_METHODS)[number]>((suggestion?.method as (typeof CONTACT_METHODS)[number]) ?? 'Call')
  const { pending, error, run } = useAction()
  const submit = () => {
    if (!text.trim()) return
    if (mode === 'exchange')
      run(() => logFollowUp({ dealId, type, body: text, next: scheduleOn ? { date, time, method: nextMethod } : null }), () => setText(''))
    else run(() => addPropertyNote(dealId, text), () => setText(''))
  }

  const fieldClass = 'rounded-sm border border-border bg-white px-2.5 py-2 text-sm text-ink outline-none focus:border-magenta'
  const tab = (m: 'exchange' | 'property', label: string) => (
    <button type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={`cursor-pointer rounded-full px-3.5 py-1.5 text-[13px] font-semibold ${mode === m ? 'bg-ink text-white' : 'bg-bg-warm text-gray-700'}`}>
      {label}
    </button>
  )
  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-border bg-white p-4">
      <div className="flex gap-1.5">
        {tab('exchange', 'Contact exchange')}
        {tab('property', 'Property note')}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === 'Enter' && submit()}
        placeholder={mode === 'property' ? 'Condition, access, neighborhood — anything about the property' : hasContact ? 'What happened on this call, text or email?' : 'Log your first contact with the agent'}
        aria-label={mode === 'property' ? 'Property note' : 'What happened'}
        rows={3}
        maxLength={5000}
        className="resize-none bg-transparent text-[15px] leading-normal text-ink outline-none"
      />
      {mode === 'exchange' && (
        <>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[13px] font-semibold text-gray-700">How</span>
            <TypeChips value={type} onChange={setType} />
          </div>
          <div className="flex flex-col gap-2.5 rounded-md border border-border bg-bg p-3">
            <label className="flex cursor-pointer items-center gap-2 text-[13px] font-semibold">
              <input type="checkbox" checked={scheduleOn} onChange={(e) => setScheduleOn(e.target.checked)} className="size-4 accent-[#ac0a55]" />
              Schedule next follow-up
            </label>
            {suggestion && <span className="text-xs font-semibold text-magenta">↻ Suggested by cadence · {suggestion.label}</span>}
            {scheduleOn && (
              <div className="flex flex-col gap-2.5">
                <div className="grid grid-cols-2 gap-2.5">
                  <label className="flex flex-col gap-1 text-xs font-semibold text-gray-700">
                    Date
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={fieldClass} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-semibold text-gray-700">
                    Time
                    <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={fieldClass} />
                  </label>
                </div>
                <TypeChips value={nextMethod} onChange={setNextMethod} />
              </div>
            )}
          </div>
        </>
      )}
      <div className="flex justify-end">
        <Button size="xs" onClick={submit} disabled={pending || !text.trim()}>
          {pending ? 'Saving…' : mode === 'property' ? 'Save note' : 'Log exchange'}
        </Button>
      </div>
      <Err msg={error} />
    </div>
  )
}

const EVENT_ICON: Record<string, string> = {
  created: '✨', imported: '✨', stage_changed: '➡️', status_changed: '🏷️',
  offer_changed: '💲', agent_changed: '👤', followup_scheduled: '🔁', followup_done: '✅',
}

function eventText(kind: string, data: Record<string, unknown>): string {
  const n = (x: unknown) => (x == null ? null : Number(x))
  const stage = (x: unknown) => STAGES[Number(x)]?.name ?? '—'
  switch (kind) {
    case 'created': return 'Deal created'
    case 'imported': return 'Imported from DealioDesk'
    case 'stage_changed': return `Stage: ${stage(data.from)} → ${stage(data.to)}`
    case 'status_changed': return `Lead status: ${data.from ?? '—'} → ${data.to ?? '—'}`
    case 'offer_changed': return `Offer updated — Cash ${money(n(data.cashFrom))} → ${money(n(data.cashTo))}, Cash+ ${money(n(data.cashPlusFrom))} → ${money(n(data.cashPlusTo))}`
    case 'agent_changed': return `Agent: ${data.from ?? 'none'} → ${data.to ?? 'none'}`
    case 'followup_scheduled': return `Scheduled a ${data.method} follow-up for ${data.date}${data.time ? `, ${data.time}` : ''}`
    case 'followup_done': return data.source === 'Manual' ? `Completed task: ${data.title ?? ''}`.trim() : `Completed a ${data.method ?? ''} follow-up`.replace(/\s+/g, ' ')
    default: return kind
  }
}

function EventRow({ item }: { item: Extract<TimelineItem, { source: 'event' }> }) {
  return (
    <div className="flex items-center gap-2.5 px-1.5 py-1 text-[13px] text-gray-500">
      <span aria-hidden className="w-5 text-center">{EVENT_ICON[item.kind] ?? '•'}</span>
      <span className="flex-1 leading-snug">{eventText(item.kind, item.data)}</span>
      <span className="whitespace-nowrap text-xs">{item.when}</span>
    </div>
  )
}

function PropertyCard({ note }: { note: { id: string; body: string; when: string } }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(note.body)
  const [confirm, setConfirm] = useState(false)
  const { pending, error, run, setError } = useAction()
  return (
    <div className="flex flex-col gap-2 rounded-[14px] border border-border bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-[#eef2ff] px-2.5 py-[3px] text-xs font-bold text-[#4338ca]">Property note</span>
        <span className="flex items-center gap-3 text-xs text-gray-500">
          {note.when}
          {!editing && (
            <>
              <button type="button" onClick={() => setEditing(true)} className="cursor-pointer font-semibold text-gray-700 hover:text-magenta">Edit</button>
              <button type="button" onClick={() => { setError(''); setConfirm(true) }} className="cursor-pointer font-semibold text-gray-700 hover:text-magenta">Delete</button>
            </>
          )}
        </span>
      </div>
      {editing ? (
        <div className="flex flex-col gap-2.5">
          <textarea value={text} onChange={(e) => setText(e.target.value)} aria-label="Edit property note" rows={3} maxLength={5000} className="resize-y rounded-sm border border-border bg-bg px-3 py-2.5 text-[15px] leading-normal outline-none focus:border-magenta" />
          <div className="flex gap-2">
            <Button size="xs" disabled={pending || !text.trim()} onClick={() => run(() => updatePropertyNote(note.id, text), () => setEditing(false))}>Save</Button>
            <Button size="xs" variant="outline" onClick={() => { setEditing(false); setText(note.body); setError('') }}>Cancel</Button>
          </div>
        </div>
      ) : (
        <span className="whitespace-pre-wrap text-[15px] leading-normal">{note.body}</span>
      )}
      <Err msg={editing ? error : ''} />
      {confirm && (
        <ConfirmDialog detail={note.body.length > 140 ? note.body.slice(0, 140) + '…' : note.body} busy={pending} error={error} onCancel={() => setConfirm(false)} onConfirm={() => run(() => deletePropertyNote(note.id), () => setConfirm(false))} />
      )}
    </div>
  )
}

/** The unified deal history: exchanges and property notes (editable) interleaved with read-only system events. */
export function Timeline({ items }: { items: TimelineItem[] }) {
  if (items.length === 0)
    return <p className="rounded-[14px] border border-border bg-white p-4 text-sm text-gray-500">Nothing logged yet. Log your first exchange or property note above.</p>
  return (
    <div className="flex flex-col gap-2.5">
      {items.map((it) =>
        it.source === 'exchange' ? (
          <NoteCard key={it.id} note={{ id: it.id, type: it.method, body: it.body, when: it.when }} />
        ) : it.source === 'property' ? (
          <PropertyCard key={it.id} note={{ id: it.id, body: it.body, when: it.when }} />
        ) : (
          <EventRow key={it.id} item={it} />
        ),
      )}
    </div>
  )
}

function NoteCard({ note }: { note: NoteItem }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(note.body)
  const [type, setType] = useState(note.type as (typeof CONTACT_METHODS)[number])
  const [confirm, setConfirm] = useState(false)
  const { pending, error, run, setError } = useAction()

  return (
    <div className="flex flex-col gap-2 rounded-[14px] border border-border bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-bg-warm px-2.5 py-[3px] text-xs font-bold text-gray-700">{note.type}</span>
        <span className="flex items-center gap-3 text-xs text-gray-500">
          {note.when}
          {!editing && (
            <>
              <button type="button" onClick={() => setEditing(true)} className="cursor-pointer font-semibold text-gray-700 hover:text-magenta">Edit</button>
              <button type="button" onClick={() => { setError(''); setConfirm(true) }} className="cursor-pointer font-semibold text-gray-700 hover:text-magenta">Delete</button>
            </>
          )}
        </span>
      </div>
      {editing ? (
        <div className="flex flex-col gap-2.5">
          <TypeChips value={type} onChange={setType} />
          <textarea value={text} onChange={(e) => setText(e.target.value)} aria-label="Edit note" rows={3} maxLength={5000} className="resize-y rounded-sm border border-border bg-bg px-3 py-2.5 text-[15px] leading-normal outline-none focus:border-magenta" />
          <div className="flex gap-2">
            <Button size="xs" disabled={pending || !text.trim()} onClick={() => run(() => updateNote(note.id, type, text), () => setEditing(false))}>Save</Button>
            <Button size="xs" variant="outline" onClick={() => { setEditing(false); setText(note.body); setType(note.type as (typeof CONTACT_METHODS)[number]); setError('') }}>Cancel</Button>
          </div>
        </div>
      ) : (
        <span className="whitespace-pre-wrap text-[15px] leading-normal">{note.body}</span>
      )}
      <Err msg={editing ? error : ''} />
      {confirm && (
        <ConfirmDialog
          detail={note.body.length > 140 ? note.body.slice(0, 140) + '…' : note.body}
          busy={pending}
          error={error}
          onCancel={() => setConfirm(false)}
          onConfirm={() => run(() => deleteNote(note.id), () => setConfirm(false))}
        />
      )}
    </div>
  )
}

export function OpenTasks({ dealId, dealLabel, tasks }: { dealId: string; dealLabel: string; tasks: DealTask[] }) {
  return (
    <OpenTasksList
      tasks={tasks.map((t) => ({ ...t, dealLabel }))}
      completer={completeTask}
      addDealId={dealId}
      addDealLabel={dealLabel}
    />
  )
}

export function CadenceControl({
  dealId,
  current,
  options,
  status,
}: {
  dealId: string
  current: { id: string; step: number; total: number } | null
  options: { id: string; name: string; steps: number }[]
  status: 'none' | 'active' | 'complete' | 'paused'
}) {
  const { pending, error, run } = useAction()
  return (
    <div className="flex flex-col gap-2.5 rounded-[14px] border border-border bg-white p-[18px]">
      <h2 className="text-[13px] font-bold uppercase tracking-[.04em]">Cadence</h2>
      <select
        value={current?.id ?? ''}
        disabled={pending}
        onChange={(e) => run(() => setDealCadence(dealId, e.target.value || null))}
        className="rounded-sm border border-border bg-white px-2.5 py-2 text-sm text-ink outline-none focus:border-magenta disabled:opacity-60"
      >
        <option value="">No cadence</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.name} ({o.steps} steps)</option>
        ))}
      </select>
      {current && status === 'complete' && <span className="text-sm font-semibold text-green-deep">✓ Cadence complete</span>}
      {current && status === 'paused' && <span className="text-sm font-medium text-gray-500">Paused — deal is closed, lost or dead.</span>}
      {current && status === 'active' && (
        <span className="text-sm text-gray-700">
          On step <b>{Math.min(current.step + 1, current.total)}</b> of {current.total}. Logging an exchange pre-fills your next touch.
        </span>
      )}
      <Err msg={error} />
    </div>
  )
}

const EQUITY_STYLES: Record<string, { bg: string; fg: string }> = {
  'Unconfirmed': { bg: '#f3f2f0', fg: '#71717a' },
  'Has Equity':  { bg: '#d1fae5', fg: '#065f46' },
  'No Equity':   { bg: '#fbe6f0', fg: '#ac0a55' },
}

export function EquityPills({ dealId, current }: { dealId: string; current: string }) {
  const { pending, error, run } = useAction()
  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {EQUITY_STATUSES.map((s) => {
          const c = EQUITY_STYLES[s] ?? EQUITY_STYLES['Unconfirmed']
          return (
            <button
              key={s}
              type="button"
              disabled={pending}
              aria-pressed={current === s}
              onClick={() => current !== s && run(() => setEquityStatus(dealId, s))}
              className="inline-flex cursor-pointer items-center rounded-full px-3 py-1.5 text-xs font-bold transition-opacity"
              style={{ background: c.bg, color: c.fg, border: `1.5px solid ${current === s ? c.fg : 'transparent'}` }}
            >
              {s}
            </button>
          )
        })}
      </div>
      <Err msg={error} />
    </>
  )
}

export function FollowUpButton({ dealId, dealLabel }: { dealId: string; dealLabel: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>Set next follow up</Button>
      {open && <ScheduleModal mode="followup" dealId={dealId} dealLabel={dealLabel} onClose={() => setOpen(false)} />}
    </>
  )
}
