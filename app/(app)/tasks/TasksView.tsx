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

export function TasksView({ groups, limits }: { groups: TaskGroups; limits: Record<TaskGroup, number> }) {
  const [modal, setModal] = useState(false)
  const [confirm, setConfirm] = useState<TaskItem | null>(null)
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
            <section key={g} className="flex flex-col gap-0.5 rounded-xl border border-border bg-white p-[22px]">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-lg font-bold">{s.title}</h2>
                <span className="rounded-full px-2.5 py-0.5 text-[13px] font-bold" style={{ background: s.bg, color: s.color }}>{count}</span>
              </div>
              {items.map((t) => (
                <div key={t.id} className={`grid grid-cols-[22px_minmax(0,1fr)_auto_auto] items-center gap-3.5 border-t border-border py-[13px] ${t.done ? 'opacity-50' : ''}`}>
                  <input
                    type="checkbox"
                    checked={t.done}
                    disabled={pending}
                    onChange={() => toggle(t)}
                    aria-label={`${t.done ? 'Reopen' : 'Complete'}: ${t.title}`}
                    className="size-[18px] cursor-pointer accent-[#ac0a55]"
                  />
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className={`text-[15px] font-semibold ${t.done ? 'line-through' : ''}`}>{t.title}</span>
                    <span className="text-[13px] text-gray-500">
                      {t.deal ? (
                        <Link href={`/deals/${t.deal.id}?from=tasks`} className="text-gray-500 hover:text-magenta">
                          {t.deal.label}{t.deal.agentName ? ` · ${t.deal.agentName}` : ''}
                        </Link>
                      ) : (
                        'No deal'
                      )}
                      {' · '}{t.method}
                    </span>
                    {t.description && <span className="mt-0.5 whitespace-pre-wrap text-[13px] leading-[1.4] text-gray-700">{t.description}</span>}
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-[13px] font-bold" style={{ color: s.color }}>{t.dueLabel}</span>
                    <span className="text-xs text-gray-500">{t.source}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setError(''); setConfirm(t) }}
                    aria-label={`Delete: ${t.title}`}
                    className="cursor-pointer px-1.5 text-lg text-gray-400 hover:text-magenta-bright"
                  >
                    ×
                  </button>
                </div>
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
      {confirm && (
        <ConfirmDialog detail={confirm.title} busy={pending} error={error} onCancel={() => setConfirm(null)} onConfirm={remove} />
      )}
    </>
  )
}
