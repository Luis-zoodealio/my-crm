'use client'

import { useState, useTransition } from 'react'
import { ScheduleModal } from '@/components/ScheduleModal'
import { setTaskDone } from '@/lib/tasks/actions'

type CompleteResult = { ok: true } | { ok: false; error: string }

export type OpenTaskItem = {
  id: string
  title: string
  description: string | null
  method: string
  source: string
  days: number
  dueDate: string
  dueTime: string
  dealLabel?: string | null
}

export function OpenTasksList({
  tasks,
  completer,
  addDealId,
  addDealLabel,
}: {
  tasks: OpenTaskItem[]
  completer?: (taskId: string) => Promise<CompleteResult>
  addDealId?: string
  addDealLabel?: string
}) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<OpenTaskItem | null>(null)
  const [pending, start] = useTransition()
  const [error, setError] = useState('')

  function complete(task: OpenTaskItem) {
    setError('')
    start(async () => {
      const fn = completer ?? ((id) => setTaskDone(id, true))
      const res = await fn(task.id)
      if (!res.ok) setError(res.error)
    })
  }

  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-border bg-white p-[18px]">
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-bold uppercase tracking-[.04em]">Open tasks</h2>
        {addDealId && (
          <button type="button" onClick={() => setAdding(true)} className="cursor-pointer text-sm font-bold text-magenta">
            + Add task
          </button>
        )}
      </div>
      {tasks.length === 0 ? (
        <p className="text-sm text-gray-500">No open tasks — you&rsquo;re all caught up.</p>
      ) : (
        tasks.map((t) => (
          <OpenTaskRow key={t.id} task={t} pending={pending} onDone={() => complete(t)} onEdit={() => setEditing(t)} />
        ))
      )}
      {error && <p role="alert" className="text-sm text-magenta-bright">{error}</p>}
      {adding && addDealId && (
        <ScheduleModal mode="task" dealId={addDealId} dealLabel={addDealLabel} onClose={() => setAdding(false)} />
      )}
      {editing && (
        <ScheduleModal
          mode="editTask"
          task={{
            id: editing.id,
            title: editing.title,
            description: editing.description,
            dueDate: editing.dueDate,
            dueTime: editing.dueTime,
            method: editing.method,
            dealLabel: editing.dealLabel,
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

function OpenTaskRow({
  task,
  pending,
  onDone,
  onEdit,
}: {
  task: OpenTaskItem
  pending: boolean
  onDone: () => void
  onEdit: () => void
}) {
  const when = task.days < 0 ? `Overdue ${-task.days}d` : task.days === 0 ? 'Today' : task.days === 1 ? 'Tomorrow' : `In ${task.days}d`
  const color = task.days < 0 ? '#e11d74' : task.days === 0 ? '#b45309' : '#71717a'
  return (
    <div className="flex items-start gap-2.5 border-t border-border pt-2.5 first:border-t-0 first:pt-0">
      <button
        type="button"
        aria-label={`Mark "${task.title}" done`}
        disabled={pending}
        onClick={onDone}
        className="mt-px size-[18px] flex-none cursor-pointer rounded-[5px] border-2 border-gray-300 transition-colors hover:border-magenta hover:bg-[#fbe6f0] disabled:opacity-50"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-semibold leading-snug">{task.title}</span>
        {task.dealLabel && <span className="truncate text-xs text-gray-500">{task.dealLabel}</span>}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
          <span className="font-bold" style={{ color }}>{when}</span>
          <span className="text-gray-500">· {task.method}</span>
          <span className={`rounded-full px-1.5 py-px text-[11px] font-semibold ${task.source === 'Follow-up' ? 'bg-[#fbe6f0] text-magenta' : 'bg-bg-warm text-gray-700'}`}>
            {task.source}
          </span>
        </div>
      </div>
      <button
        type="button"
        aria-label={`Edit: ${task.title}`}
        onClick={onEdit}
        className="mt-0.5 cursor-pointer text-gray-400 hover:text-magenta"
      >
        <PencilIcon />
      </button>
    </div>
  )
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}
