import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { listCadences } from '@/lib/cadences/query'
import { getDealDetail, getOpenTasks, getTimeline } from '@/lib/deals/query'
import { fullAddress, money, plural } from '@/lib/format'
import { LAST_ACTIVE_STAGE, STAGES } from '@/lib/stages'
import { BackLink } from '@/components/BackLink'
import { ActivityComposer, CadenceControl, FollowUpButton, LeadStatusPills, OpenTasks, StageBar, Timeline } from './DealParts'

const FROM: Record<string, { label: string; href: string }> = {
  dashboard: { label: 'Dashboard', href: '/dashboard' },
  leads: { label: 'Leads', href: '/leads' },
  board: { label: 'Board', href: '/board' },
  agents: { label: 'Agents', href: '/agents' },
  agent: { label: 'agent', href: '/agents' },
  tasks: { label: 'Tasks', href: '/tasks' },
}

export async function generateMetadata({ params }: PageProps<'/deals/[id]'>) {
  const user = await requireUser()
  const deal = await getDealDetail(user.id, (await params).id, user.settings)
  return { title: `${deal ? deal.address : 'Deal'} · Zoodealio CRM` }
}

export default async function DealPage({ params, searchParams }: PageProps<'/deals/[id]'>) {
  const user = await requireUser()
  const { id } = await params
  const sp = await searchParams
  const deal = await getDealDetail(user.id, id, user.settings)
  if (!deal) notFound()

  const showAll = sp.notes === 'all'
  const [timeline, openTasks, cadences] = await Promise.all([
    getTimeline(user.id, id, user.settings.timezone, showAll),
    getOpenTasks(user.id, id, user.settings.timezone),
    listCadences(user.id),
  ])

  const from = FROM[typeof sp.from === 'string' ? sp.from : ''] ?? FROM.leads
  const label = fullAddress(deal)
  const stale = deal.stage <= LAST_ACTIVE_STAGE && deal.daysSinceContact >= user.settings.staleDays
  const contact =
    deal.daysSinceContact === 0
      ? 'Contacted today'
      : stale
        ? `Stale: no contact in ${deal.daysSinceContact} days`
        : `Last contact ${plural(deal.daysSinceContact, 'day')} ago`
  const a = deal.agent

  // Cadence: suggest the current step's touch when active; stop at the last step; pause when dead/closed/lost.
  const cad = deal.cadence
  const cadenceActive = deal.stage <= LAST_ACTIVE_STAGE && deal.leadStatus !== 'Dead'
  const cadStatus: 'none' | 'active' | 'complete' | 'paused' = !cad ? 'none' : !cadenceActive ? 'paused' : cad.step >= cad.steps.length ? 'complete' : 'active'
  const suggestion =
    cad && cadStatus === 'active'
      ? { days: cad.steps[cad.step].days, method: cad.steps[cad.step].method, label: `${cad.name} · step ${cad.step + 1} of ${cad.steps.length}` }
      : null

  return (
    <>
      <BackLink label={from.label} fallback={from.href} />

      <div className="flex flex-col gap-5 rounded-xl border border-border bg-white px-7 pb-5 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <LeadStatusPills dealId={deal.id} current={deal.leadStatus} />
              <span className="text-[13px] font-bold" style={{ color: stale ? '#b45309' : '#71717a' }}>{contact}</span>
            </div>
            <h1 className="text-[32px] font-bold leading-[1.1] tracking-[-0.03em]">{label}</h1>
          </div>
          <div className="flex items-center gap-2.5">
            <Link href={`/deals/${deal.id}/edit`} className="text-sm font-bold">Edit deal</Link>
            <FollowUpButton dealId={deal.id} dealLabel={label} />
          </div>
        </div>
        <StageBar dealId={deal.id} stage={deal.stage} />
      </div>

      <div className="grid grid-cols-1 items-start gap-5 min-[1200px]:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-3.5">
          <ActivityComposer dealId={deal.id} hasContact={deal.firstContactDays !== null} suggestion={suggestion} />
          <Timeline items={timeline.items} />
          {timeline.hasMore && (
            <Link href={`/deals/${deal.id}?notes=all${typeof sp.from === 'string' ? `&from=${sp.from}` : ''}`} className="w-fit text-sm font-bold">Show full history</Link>
          )}
        </div>

        <div className="flex flex-col gap-3.5">
          <OpenTasks dealId={deal.id} dealLabel={label} tasks={openTasks} />

          <div className="flex flex-col gap-3 rounded-[14px] border border-border bg-white p-[18px]">
            <h2 className="text-[13px] font-bold uppercase tracking-[.04em]">Follow-ups</h2>
            <div className="flex items-baseline gap-2">
              <span className="text-[30px] font-extrabold tracking-[-0.03em]">{deal.followUps}</span>
              <span className="text-sm text-gray-500">{deal.followUps === 1 ? 'follow-up' : 'follow-ups'}</span>
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between gap-2 border-t border-border pt-2">
                <span className="text-gray-500">Last follow-up</span>
                <span className="font-semibold">{deal.followUps >= 1 ? (deal.daysSinceContact === 0 ? 'Today' : `${plural(deal.daysSinceContact, 'day')} ago`) : 'None yet'}</span>
              </div>
              <div className="flex justify-between gap-2 border-t border-border pt-2">
                <span className="text-gray-500">First contact</span>
                <span className="font-semibold">{deal.firstContactDays === null ? 'Not made yet' : deal.firstContactDays === 0 ? 'Today' : `${plural(deal.firstContactDays, 'day')} ago`}</span>
              </div>
            </div>
          </div>

          <CadenceControl
            dealId={deal.id}
            current={cad ? { id: cad.id, step: cad.step, total: cad.steps.length } : null}
            options={cadences.map((c) => ({ id: c.id, name: c.name, steps: c.steps.length }))}
            status={cadStatus}
          />

          <div className="flex flex-col gap-3 rounded-[14px] border border-border bg-white p-[18px]">
            <h2 className="text-[13px] font-bold uppercase tracking-[.04em]">Agent</h2>
            {a ? (
              <>
                <div className="flex flex-col gap-0.5">
                  <span className="text-lg font-bold">{a.name}</span>
                  {a.agency && <span className="text-sm text-gray-500">{a.agency}</span>}
                </div>
                <div className="flex flex-col gap-1.5 text-sm text-gray-700">
                  {a.phone && <a href={`tel:${a.phone}`} className="text-gray-700 hover:text-magenta">{a.phone}</a>}
                  {a.email && <a href={`mailto:${a.email}`} className="break-all text-gray-700 hover:text-magenta">{a.email}</a>}
                  {!a.phone && !a.email && <span className="text-gray-500">No contact details yet.</span>}
                </div>
                <Link href={`/agents/${a.id}?from=deal`} className="text-sm font-bold">
                  View all {a.dealCount} {a.dealCount === 1 ? 'deal' : 'deals'} with {a.name.split(' ')[0]}
                </Link>
              </>
            ) : (
              <p className="text-sm text-gray-500">No agent on this deal. <Link href={`/deals/${deal.id}/edit`} className="font-bold">Add one</Link></p>
            )}
          </div>

          <div className="flex flex-col gap-1 rounded-xl bg-magenta p-5 text-white">
            <span className="text-[13px] opacity-90">Current offers</span>
            <div className="flex items-baseline justify-between"><span className="text-[13px] opacity-90">Cash</span><span className="text-[26px] font-extrabold tracking-[-0.04em]">{money(deal.cashOffer)}</span></div>
            <div className="flex items-baseline justify-between"><span className="text-[13px] opacity-90">Cash+</span><span className="text-[26px] font-extrabold tracking-[-0.04em]">{money(deal.cashPlusOffer)}</span></div>
            <span className="text-[13px]">{STAGES[deal.stage].name}</span>
          </div>
        </div>
      </div>
    </>
  )
}
