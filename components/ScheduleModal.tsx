'use client'

import { useEffect, useState, useTransition } from 'react'
import { Button } from '@/components/Button'
import { Modal } from '@/components/Modal'
import { scheduleFollowUp } from '@/lib/deals/actions'
import { CONTACT_METHODS } from '@/lib/stages'
import { createTask, searchDeals } from '@/lib/tasks/actions'

const fieldClass = 'rounded-sm border border-border bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-magenta'

const tomorrow = () => new Date(Date.now() + 864e5).toLocaleDateString('en-CA')

type Props =
  | { mode: 'followup'; dealId: string; dealLabel: string; onClose: () => void }
  | { mode: 'task'; onClose: () => void }

type PickedDeal = { id: string; label: string }

/**
 * Shared schedule modal.
 * - followup: from a deal. Sets the deal's next follow-up (replaces its open one).
 * - task: from Tasks. Creates a Manual task, optionally linked to a deal found by server-side search.
 */
export function ScheduleModal(props: Props) {
  const { onClose } = props
  const isTask = props.mode === 'task'
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(tomorrow)
  const [time, setTime] = useState('09:00')
  const [method, setMethod] = useState<(typeof CONTACT_METHODS)[number]>('Call')
  const [deal, setDeal] = useState<PickedDeal | null>(null)
  const [error, setError] = useState('')
  const [pending, start] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (isTask && !title.trim()) return setError('Give the task a title.')
    start(async () => {
      const res =
        props.mode === 'followup'
          ? await scheduleFollowUp({ dealId: props.dealId, title, description, date, time, method })
          : await createTask({ dealId: deal?.id ?? null, title, description, date, time, method })
      if (!res.ok) setError(res.error)
      else onClose()
    })
  }

  return (
    <Modal title={isTask ? 'New task' : 'Set next follow-up'} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-[18px]">
        {props.mode === 'followup' ? (
          <span className="text-sm text-gray-500">{props.dealLabel}</span>
        ) : (
          <DealPicker deal={deal} onChange={setDeal} />
        )}
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Title
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder={isTask ? 'Task' : 'Follow up'} className={fieldClass} />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Description
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={2000} placeholder="Notes for this task" className={`${fieldClass} resize-y leading-normal`} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
            Date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className={fieldClass} />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
            Time
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required className={fieldClass} />
          </label>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold">How</span>
          <div className="flex flex-wrap gap-1.5 text-[13px] font-medium" role="radiogroup" aria-label="How">
            {CONTACT_METHODS.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={method === m}
                onClick={() => setMethod(m)}
                className={`cursor-pointer rounded-full px-[13px] py-[7px] ${method === m ? 'bg-ink text-white' : 'bg-bg-warm text-gray-700'}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        {error && <p role="alert" className="text-sm text-magenta-bright">{error}</p>}
        <div className="flex justify-end gap-2.5">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving…' : isTask ? 'Add task' : 'Schedule follow-up'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/** Optional deal link. Searches on the server as you type, so it works with thousands of deals. */
function DealPicker({ deal, onChange }: { deal: PickedDeal | null; onChange: (d: PickedDeal | null) => void }) {
  const [q, setQ] = useState('')
  const [found, setFound] = useState<{ id: string; label: string; agentName: string | null }[] | null>(null)
  const results = q.trim() ? found : null

  useEffect(() => {
    if (!q.trim()) return
    let stale = false
    const t = setTimeout(async () => {
      const r = await searchDeals(q).catch(() => [])
      if (!stale) setFound(r)
    }, 250)
    return () => {
      stale = true
      clearTimeout(t)
    }
  }, [q])

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold">Deal (optional)</span>
      {deal ? (
        <div className="flex items-center justify-between gap-2.5 rounded-sm border border-border bg-bg px-3 py-2.5 text-sm">
          <span>{deal.label}</span>
          <button type="button" onClick={() => onChange(null)} aria-label="Remove deal" className="cursor-pointer text-lg leading-none text-gray-500">×</button>
        </div>
      ) : (
        <>
          <input type="text" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search deals" placeholder="Search by address or agent" className={fieldClass} />
          {results && results.length > 0 && (
            <div className="overflow-hidden rounded-sm border border-border">
              {results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    onChange({ id: r.id, label: r.label })
                    setQ('')
                  }}
                  className="flex w-full cursor-pointer flex-col gap-px border-t border-border px-3 py-2.5 text-left first:border-t-0 hover:bg-bg"
                >
                  <span className="text-sm font-semibold">{r.label}</span>
                  {r.agentName && <span className="text-xs text-gray-500">{r.agentName}</span>}
                </button>
              ))}
            </div>
          )}
          {results && results.length === 0 && <span className="text-[13px] text-gray-500">No matching deals.</span>}
        </>
      )}
    </div>
  )
}
