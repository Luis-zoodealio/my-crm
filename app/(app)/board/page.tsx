import { requireUser } from '@/lib/auth'
import { getBoard } from '@/lib/board/query'
import { BoardView } from './BoardView'

export const metadata = { title: 'Board · Zoodealio CRM' }

export default async function BoardPage() {
  const user = await requireUser()
  const columns = await getBoard(user.id)
  return <BoardView columns={columns} staleDays={user.settings.staleDays} timezone={user.settings.timezone} />
}
