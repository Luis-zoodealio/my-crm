import { requireUser } from '@/lib/auth'
import { getTaskGroups, parseLimits } from '@/lib/tasks/query'
import { TasksView } from './TasksView'

export const metadata = { title: 'Tasks · Zoodealio CRM' }

export default async function TasksPage({ searchParams }: PageProps<'/tasks'>) {
  const user = await requireUser()
  const limits = parseLimits(await searchParams)
  const groups = await getTaskGroups(user.id, user.settings, limits)
  return <TasksView groups={groups} limits={limits} />
}
