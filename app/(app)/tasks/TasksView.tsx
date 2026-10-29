'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { Button } from '@/components/Button'
import { ConfirmDialog } from '@/components/Modal'
import { ScheduleModal } from '@/components/ScheduleModal'
import { deleteTask, setTaskDone } from '@/lib/tasks/actions'
import { GROUP_PAGE, TASK_GROUPS, type TaskGroup } from '@/lib/tasks/groups'
import type { TaskGroups, TaskItem } from '@/lib/tasks/query'

const GROUP_STYLE: Record<TaskGroup, { title: string; color: string; bg: string }> = {
  overdue: { title: 'Overdue', color: '#e11d74', bg: '#fbe6f0' },
  today: { title: 'Today', color: '#b45309', bg: '#fff4e5' },
  upcoming: { title: 'Upcoming', color: '#3f3f46', bg: '#f3f2f0' },
  completed: { title: 'Completed', color: '#71717a', bg: '#f3f2f0' },
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

export function TasksView({ groups, limits }: { groups: TaskGroups; limits: Record<TaskGroup, number> }) {
  const [modal, setModal] = useState(false)
  const [confirm, setConfirm] = useState<TaskItem | null>(null)
  const [editTask, setEditTask] = useState<TaskItem | null>(null)
  const [pending, start] = useTransition()
  const [error, setError] = useState('')

  const open = groups.overdue.count + groups.today.count + groups.upcoming.count
  const total = open + groups.completed.count

  const showMore = (g: TaskGroup) => {
    const q = new URLSearchParams()
    for (const k of TASK_GROUPS) if (limits[k] > GROUP_PAGE || k === g) q.set(k, String(limits[k] + (k === g ? GROUP_PAGE : 0)))
    return `/tasks?${q}`
  }

  function toggle(t: TaskItem) {
    setError('')
    start(async () => {
      const res = await setTaskDone(t.id, !t.done)
      if (!res.ok) setError(res.error)
    })
  }

  function remove() {
    if (!confirm) return
    setError('')
    start(async () => {
      const res = await deleteTask(confirm.id)
      if (!res.ok) setError(res.error)
      else setConfirm(null)
    })
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-[-0.03em]">
          Tasks <span className="ml-1.5 text-sm font-medium tracking-normal text-gray-500">{open} open</span>
        </h1>
        <Button onClick={() => setModal(true)}>+ New task</Button>
      </div>
      <p className="text-sm text-gray-500">Scheduling a follow-up on a deal adds it here.</p>
      {error && !confirm && <p role="alert" className="text-sm text-magenta-bright">{error}</p>}

      {total === 0 && (
        <div className="flex max-w-[520px] flex-col items-start gap-3 rounded-xl border border-border bg-white p-6 shadow-sm">
          <span className="text-lg font-bold">No tasks yet</span>
          <p className="text-[15px] leading-normal text-gray-700">Add a task here, or set a follow-up on any deal and it shows up in this list.</p>
          <Button onClick={() => setModal(true)}>+ New task</Button>
        </div>
      )}

      <div className={`flex flex-col gap-6 transition-opacity ${pending ? 'opacity-70' : ''}`}>
        {TASK_GROUPS.filter((g) => groups[g].count > 0).map((g) => {
          const s = GROUP_STYLE[g]
          const { items, count } = groups[g]
          return (
            <section key={g} className="flex flex-col gap-0 rounded-xl border border-border bg-white p-[22px]">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold">{s.title}</h2>
                <span className="rounded-full px-2.5 py-0.5 text-[13px] font-bold" style={{ background: s.bg, color: s.color }}>{count}</span>
              </div>
              {items.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  groupColor={s.color}
                  pending={pending}
                  onToggle={() => toggle(t)}
                  onEdit={() => setEditTask(t)}
                  onDelete={() => { setError(''); setConfirm(t) }}
                />
              ))}
              {count > items.length && (
                <div className="flex items-center justify-between border-t border-border pt-3 text-[13px] text-gray-500">
                  <span>Showing {items.length} of {count}</span>
                  <Link href={showMore(g)} scroll={false} className="font-bold">Show {Math.min(GROUP_PAGE, count - items.length)} more</Link>
                </div>
              )}
            </section>
          )
        })}
      </div>

      {modal && <ScheduleModal mode="task" onClose={() => setModal(false)} />}
      {editTask && (
        <ScheduleModal
          mode="editTask"
          task={{
            id: editTask.id,
            title: editTask.title,
            description: editTask.description,
            dueDate: editTask.dueDate,
            dueTime: editTask.dueTime,
            method: editTask.method,
            dealLabel: editTask.deal?.label ?? null,
          }}
          onClose={() => setEditTask(null)}
        />
      )}
      {confirm && (
        <ConfirmDialog detail={confirm.title} busy={pending} error={error} onCancel={() => setConfirm(null)} onConfirm={remove} />
      )}
    </>
  )
}

function TaskRow({
  task,
  groupColor,
  pending,
  onToggle,
  onEdit,
  onDelete,
}: {
  task: TaskItem
  groupColor: string
  pending: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className={`border-t border-border py-3.5 ${task.done ? 'opacity-50' : ''}`}>
      <div className="grid grid-cols-[22px_minmax(0,1.7fr)_minmax(0,1fr)_76px_116px_20px_20px] items-center gap-3">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={task.done}
          disabled={pending}
          onChange={onToggle}
          aria-label={`${task.done ? 'Reopen' : 'Complete'}: ${task.title}`}
          className="size-[18px] cursor-pointer accent-[#ac0a55]"
        />

        {/* Title + property */}
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className={`text-[15px] font-semibold leading-snug ${task.done ? 'line-through' : ''}`}>{task.title}</span>
          {task.description && (
            <span className="truncate text-[12px] leading-[1.4] text-gray-500">{task.description}</span>
          )}
          {task.deal && (
            <Link
              href={`/deals/${task.deal.id}?from=tasks`}
              className="truncate text-[12px] text-gray-400 hover:text-magenta"
            >
              {task.deal.label}
            </Link>
          )}
        </div>

        {/* Agent + last contact */}
        <div className="flex min-w-0 flex-col gap-0.5">
          {task.deal?.agentName ? (
            <>
              {task.deal.agentId ? (
                <Link
                  href={`/agents/${task.deal.agentId}?from=deal`}
                  className="truncate text-[13px] font-semibold text-gray-700 hover:text-magenta"
                >
                  {task.deal.agentName}
                </Link>
              ) : (
                <span className="truncate text-[13px] font-semibold text-gray-700">{task.deal.agentName}</span>
              )}
              {task.agentLastContactLabel && (
                <span className="text-[11px] text-gray-400">Last contact {task.agentLastContactLabel}</span>
              )}
            </>
          ) : (
            <span className="text-[13px] text-gray-400">—</span>
          )}
        </div>

        {/* Method */}
        <div className="flex justify-center">
          <span className="rounded-full bg-bg-warm px-2.5 py-[3px] text-[11px] font-semibold text-gray-700 whitespace-nowrap">
            {task.method}
          </span>
        </div>

        {/* Due + source */}
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-[13px] font-bold" style={{ color: groupColor }}>{task.dueLabel}</span>
          <span className="text-[11px] text-gray-400">{task.source}</span>
        </div>

        {/* Edit */}
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit: ${task.title}`}
          className="flex cursor-pointer items-center justify-center text-gray-400 hover:text-magenta"
        >
          <PencilIcon />
        </button>

        {/* Delete */}
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete: ${task.title}`}
          className="cursor-pointer px-0.5 text-lg leading-none text-gray-400 hover:text-magenta-bright"
        >
          ×
        </button>
      </div>
    </div>
  )
}
