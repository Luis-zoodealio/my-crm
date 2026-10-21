import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { BackLink } from '@/components/BackLink'
import { LeadPill } from '@/components/LeadPill'
import { requireUser } from '@/lib/auth'
import { AGENT_DEALS_PAGE, getAgent, getAgentDeals } from '@/lib/agents/query'
import { compactMoney, fullAddress, money } from '@/lib/format'
import { STAGES } from '@/lib/stages'
import { AgentEdit } from './AgentEdit'

export async function generateMetadata({ params }: PageProps<'/agents/[id]'>) {
  const user = await requireUser()
  const agent = await getAgent(user.id, (await params).id)
  return { title: `${agent ? agent.name : 'Agent'} · Zoodealio CRM` }
}

export default async function AgentPage({ params, searchParams }: PageProps<'/agents/[id]'>) {
  const user = await requireUser()
  const { id } = await params
  const sp = await searchParams
  const agent = await getAgent(user.id, id)
  if (!agent) notFound()

  const page = Math.max(1, Math.min(100000, Number.parseInt(typeof sp.page === 'string' ? sp.page : '1', 10) || 1))
  const deals = await getAgentDeals(user.id, id, page)
  if (deals.length === 0 && page > 1) redirect(`/agents/${id}`)

  const fromDeal = sp.from === 'deal'
  const pageCount = Math.max(1, Math.ceil(agent.dealCount / AGENT_DEALS_PAGE))
  const pageHref = (p: number) => {
    const q = new URLSearchParams({ ...(fromDeal ? { from: 'deal' } : {}), ...(p > 1 ? { page: String(p) } : {}) })
    return q.size ? `/agents/${id}?${q}` : `/agents/${id}`
  }
  const pagerBtn = 'inline-flex items-center rounded-[9px] border border-border bg-white px-3.5 py-[7px] text-[13px] font-bold leading-none'

  return (
    <>
      <BackLink label={fromDeal ? 'deal' : 'Agents'} fallback={fromDeal ? '/leads' : '/agents'} />

      <div className="grid grid-cols-1 items-start gap-5 min-[1100px]:grid-cols-[320px_minmax(0,1fr)]">
        <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-white p-6">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-[28px] font-bold leading-[1.1] tracking-[-0.03em]">{agent.name}</h1>
            {agent.agency && <span className="text-[15px] text-gray-500">{agent.agency}</span>}
          </div>
          <div className="flex flex-col gap-1.5 text-sm text-gray-700">
            {agent.phone && <a href={`tel:${agent.phone}`} className="text-gray-700 hover:text-magenta">{agent.phone}</a>}
            {agent.email && <a href={`mailto:${agent.email}`} className="break-all text-gray-700 hover:text-magenta">{agent.email}</a>}
            {!agent.phone && !agent.email && <span className="text-gray-500">No contact details yet.</span>}
          </div>
          <div className="grid grid-cols-2 gap-2.5 border-t border-border pt-3.5">
            <div>
              <div className="text-xs text-gray-500">Deals</div>
              <div className="text-2xl font-extrabold tracking-[-0.03em]">{agent.dealCount}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Total offers</div>
              <div className="text-2xl font-extrabold tracking-[-0.03em]">{compactMoney(agent.totalOffers)}</div>
            </div>
          </div>
          <AgentEdit agent={{ id: agent.id, name: agent.name, agency: agent.agency ?? '', phone: agent.phone ?? '', email: agent.email ?? '' }} />
        </div>

        <section className="flex flex-col gap-0.5 rounded-xl border border-border bg-white p-[22px]">
          <h2 className="mb-2 text-lg font-bold">Deals with {agent.name}</h2>
          {deals.length === 0 && <p className="border-t border-border py-4 text-sm text-gray-500">No deals with this agent yet.</p>}
          {deals.map((d) => (
            <Link
              key={d.id}
              href={`/deals/${d.id}?from=agent`}
              className="grid grid-cols-[90px_minmax(0,1.5fr)_minmax(0,1.2fr)_150px] items-center gap-3 border-t border-border py-3.5 text-ink hover:text-ink"
            >
              <LeadPill status={d.leadStatus} />
              <span className="text-[15px] font-bold">{fullAddress(d)}</span>
              <span className="text-sm text-gray-700">{STAGES[d.stage].name}</span>
              <div className="flex flex-col gap-0.5 text-[13px]">
                <div className="flex justify-between gap-2"><span className="text-gray-500">Cash</span><span className="font-extrabold tracking-[-0.02em]">{money(d.cashOffer)}</span></div>
                <div className="flex justify-between gap-2"><span className="text-gray-500">Cash+</span><span className="font-extrabold tracking-[-0.02em]">{money(d.cashPlusOffer)}</span></div>
              </div>
            </Link>
          ))}
          {agent.dealCount > AGENT_DEALS_PAGE && (
            <nav aria-label="Pagination" className="flex items-center justify-between gap-3 border-t border-border pt-3.5 text-sm text-gray-700">
              <span>Page {page} of {pageCount}</span>
              <div className="flex gap-2">
                {page > 1 ? <Link href={pageHref(page - 1)} className={`${pagerBtn} text-ink hover:text-magenta`}>Previous</Link> : <span className={`${pagerBtn} opacity-50`}>Previous</span>}
                {page < pageCount ? <Link href={pageHref(page + 1)} className={`${pagerBtn} text-ink hover:text-magenta`}>Next</Link> : <span className={`${pagerBtn} opacity-50`}>Next</span>}
              </div>
            </nav>
          )}
        </section>
      </div>
    </>
  )
}
