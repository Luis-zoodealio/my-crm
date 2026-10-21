import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { getDealDetail } from '@/lib/deals/query'
import { DealForm } from '../../DealForm'

export const metadata = { title: 'Edit deal · Zoodealio CRM' }

export default async function EditDealPage({ params }: PageProps<'/deals/[id]/edit'>) {
  const user = await requireUser()
  const { id } = await params
  const deal = await getDealDetail(user.id, id, user.settings)
  if (!deal) notFound()

  return (
    <DealForm
      mode="edit"
      dealId={deal.id}
      initial={{
        address: deal.address,
        city: deal.city ?? '',
        state: deal.state ?? '',
        zip: deal.zip ?? '',
        stage: deal.stage,
        leadStatus: deal.leadStatus,
        cashOffer: deal.cashOffer == null ? '' : String(deal.cashOffer),
        cashPlusOffer: deal.cashPlusOffer == null ? '' : String(deal.cashPlusOffer),
        agent: deal.agent ? { id: deal.agent.id, name: deal.agent.name, agency: deal.agent.agency } : null,
      }}
    />
  )
}
