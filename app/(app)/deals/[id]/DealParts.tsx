'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/Button'
import { ConfirmDialog } from '@/components/Modal'
import { ScheduleModal } from '@/components/ScheduleModal'
import {
  addPropertyNote,
  deleteNote,
  deletePropertyNote,
  logFollowUp,
  setLeadStatus,
  setStage,
  updateNote,
  updatePropertyNote,
  type Result,
} from '@/lib/deals/actions'
import type { NoteItem, PropertyNoteItem } from '@/lib/deals/query'
import { CONTACT_METHODS, LEAD_STATUS_COLORS, LEAD_STATUSES, STAGES, type LeadStatus } from '@/lib/stages'

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
 * Logs an exchange and, by default, schedules the next follow-up in one step.
 * The first exchange on a deal is "first contact"; everything after counts as a follow-up.
 */
export function LogFollowUp({ dealId, hasContact }: { dealId: string; hasContact: boolean }) {
  const [text, setText] = useState('')
  const [type, setType] = useState<(typeof CONTACT_METHODS)[number]>('Call')
  const [scheduleOn, setScheduleOn] = useState(true)
  const [date, setDate] = useState(inThreeDays)
  const [time, setTime] = useState('09:00')
  const [nextMethod, setNextMethod] = useState<(typeof CONTACT_METHODS)[number]>('Call')
  const { pending, error, run } = useAction()
  const submit = () =>
    text.trim() &&
    run(
      () => logFollowUp({ dealId, type, body: text, next: scheduleOn ? { date, time, method: nextMethod } : null }),
      () => setText(''),
    )

  const fieldClass = 'rounded-sm border border-border bg-white px-2.5 py-2 text-sm text-ink outline-none focus:border-magenta'
  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-border bg-white p-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === 'Enter' && submit()}
        placeholder={hasContact ? 'What happened on this call, text or email?' : 'Log your first contact with the agent'}
        aria-label="What happened"
        rows={3}
        maxLength={5000}
        className="resize-none bg-transparent text-[15px] leading-normal text-ink outline-none"
      />
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-[13px] font-semibold text-gray-700">How</span>
        <TypeChips value={type} onChange={setType} />
      </div>

      <div className="flex flex-col gap-2.5 rounded-md border border-border bg-bg p-3">
        <label className="flex cursor-pointer items-center gap-2 text-[13px] font-semibold">
          <input type="checkbox" checked={scheduleOn} onChange={(e) => setScheduleOn(e.target.checked)} className="size-4 accent-[#ac0a55]" />
          Schedule next follow-up
        </label>
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

      <div className="flex justify-end">
        <Button size="xs" onClick={submit} disabled={pending || !text.trim()}>
          {pending ? 'Saving…' : 'Log exchange'}
        </Button>
      </div>
      <Err msg={error} />
    </div>
  )
}

export function NoteFeed({ items }: { items: NoteItem[] }) {
  return items.map((n) => <NoteCard key={n.id} note={n} />)
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

export function PropertyNotes({ dealId, items }: { dealId: string; items: PropertyNoteItem[] }) {
  const [text, setText] = useState('')
  const { pending, error, run } = useAction()
  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-border bg-white p-[18px]">
      <h2 className="text-[13px] font-bold uppercase tracking-[.04em]">Property notes</h2>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label="Property note"
        placeholder="Condition, access, neighborhood, anything about the property"
        rows={3}
        maxLength={5000}
        className="resize-y rounded-md border border-border bg-bg px-3 py-2.5 text-sm leading-normal text-ink outline-none focus:border-magenta"
      />
      <Button size="xs" variant="outline" disabled={pending || !text.trim()} onClick={() => run(() => addPropertyNote(dealId, text), () => setText(''))}>
        Save property note
      </Button>
      <Err msg={error} />
      {items.map((p) => <PropertyNoteRow key={p.id} note={p} />)}
    </div>
  )
}

function PropertyNoteRow({ note }: { note: PropertyNoteItem }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(note.body)
  const [confirm, setConfirm] = useState(false)
  const { pending, error, run, setError } = useAction()
  return (
    <div className="flex flex-col gap-1 border-t border-border pt-3">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{note.when}</span>
        {!editing && (
          <span className="flex gap-3">
            <button type="button" onClick={() => setEditing(true)} className="cursor-pointer font-semibold text-gray-700 hover:text-magenta">Edit</button>
            <button type="button" onClick={() => { setError(''); setConfirm(true) }} className="cursor-pointer font-semibold text-gray-700 hover:text-magenta">Delete</button>
          </span>
        )}
      </div>
      {editing ? (
        <div className="flex flex-col gap-2">
          <textarea value={text} onChange={(e) => setText(e.target.value)} aria-label="Edit property note" rows={3} maxLength={5000} className="resize-y rounded-sm border border-border bg-bg px-3 py-2 text-sm leading-normal outline-none focus:border-magenta" />
          <div className="flex gap-2">
            <Button size="xs" disabled={pending || !text.trim()} onClick={() => run(() => updatePropertyNote(note.id, text), () => setEditing(false))}>Save</Button>
            <Button size="xs" variant="outline" onClick={() => { setEditing(false); setText(note.body); setError('') }}>Cancel</Button>
          </div>
          <Err msg={error} />
        </div>
      ) : (
        <span className="whitespace-pre-wrap text-sm leading-normal">{note.body}</span>
      )}
      {confirm && (
        <ConfirmDialog
          detail={note.body.length > 140 ? note.body.slice(0, 140) + '…' : note.body}
          busy={pending}
          error={error}
          onCancel={() => setConfirm(false)}
          onConfirm={() => run(() => deletePropertyNote(note.id), () => setConfirm(false))}
        />
      )}
    </div>
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
