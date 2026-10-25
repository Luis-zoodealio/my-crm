import Link from 'next/link'
import { ButtonLink } from '@/components/Button'
import { DashboardEmpty } from './DashboardEmpty'
import { requireUser } from '@/lib/auth'
import { getDashboard, type DashboardRow } from '@/lib/queries/dashboard'
import { compactMoney, fullAddress, plural } from '@/lib/format'
import { STAGES } from '@/lib/stages'
import { leadsViewHref, staleHref } from '@/lib/views'

export const metadata = { title: 'Dashboard · Zoodealio CRM' }

export default async function DashboardPage() {
  const user = await requireUser()
  const data = await getDashboard(user.id, user.settings)
  const { staleDays } = user.settings

  const tiles = [
    { label: 'Hot leads', value: data.hot.count, note: `${compactMoney(data.hot.offers)} in offers`, href: leadsViewHref('Hot only'), featured: true },
    { label: 'Overdue follow-ups', value: data.overdue.count, note: 'Needs a call today', href: leadsViewHref('Overdue follow-ups') },
    { label: `Stale, ${staleDays}+ days`, value: data.stale.count, note: `No contact in ${plural(staleDays, 'day')}`, href: staleHref(staleDays) },
    { label: 'Under contract', value: data.underContract.count, note: compactMoney(data.underContract.offers), href: '/board' },
  ]

  const lists = [
    { title: 'Overdue', color: '#e11d74', bg: '#fbe6f0', empty: 'Nothing overdue.', block: data.overdue, sub: (r: DashboardRow) => r.title ?? '', tag: (r: DashboardRow) => r.method ?? '' },
    { title: 'Today', color: '#b45309', bg: '#fff4e5', empty: 'Nothing due today.', block: data.today, sub: (r: DashboardRow) => r.title ?? '', tag: (r: DashboardRow) => r.method ?? '' },
    { title: `Stale, ${staleDays}+ days`, color: '#3f3f46', bg: '#f3f2f0', empty: 'No stale deals.', block: data.stale, sub: (r: DashboardRow) => `${r.leadStatus}, ${STAGES[r.stage].name}`, tag: (r: DashboardRow) => `${r.daysSinceContact}d` },
  ]

  const greeting = `${plural(data.overdue.count, 'follow-up')} ${data.overdue.count === 1 ? 'is' : 'are'} overdue. ${plural(data.hot.count, 'hot lead')} to work.`

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[32px] font-bold leading-[1.1] tracking-[-0.03em]">
          {data.totalDeals === 0 ? 'Welcome to Zoodealio CRM.' : greeting}
        </h1>
        <ButtonLink href="/deals/new">+ Add deal</ButtonLink>
      </div>

      {data.totalDeals === 0 ? (
        <DashboardEmpty />
      ) : (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
            {tiles.map((t) => (
              <Link
                key={t.label}
                href={t.href}
                className={`flex flex-col gap-1.5 rounded-xl border border-border p-5 shadow-sm ${
                  t.featured ? 'bg-magenta text-white hover:text-white' : 'bg-white text-ink hover:text-ink'
                }`}
              >
                <span className="text-[13px] opacity-85">{t.label}</span>
                <span className="text-4xl font-extrabold tracking-[-0.04em]">{t.value}</span>
                <span className="text-[13px] opacity-85">{t.note}</span>
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-start gap-4">
            {lists.map((L) => (
              <section key={L.title} className="flex flex-col gap-0.5 rounded-xl border border-border bg-white p-[22px]">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-lg font-bold">{L.title}</h2>
                  <span className="rounded-full px-2.5 py-0.5 text-[13px] font-bold" style={{ background: L.bg, color: L.color }}>
                    {L.block.count}
                  </span>
                </div>
                {L.block.rows.length === 0 ? (
                  <p className="border-t border-border py-4 text-sm text-gray-500">{L.empty}</p>
                ) : (
                  L.block.rows.map((r) => (
                    <Link
                      key={r.dealId + L.title}
                      href={`/deals/${r.dealId}?from=dashboard`}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 border-t border-border py-3 text-ink hover:text-ink"
                    >
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-[15px] font-bold">{fullAddress(r)}</span>
                        {r.agentName && <span className="text-[13px] text-gray-700">{r.agentName}</span>}
                        <span className="text-[13px] text-gray-500">{L.sub(r)}</span>
                      </div>
                      <span className="text-xs font-bold" style={{ color: L.color }}>{L.tag(r)}</span>
                    </Link>
                  ))
                )}
                {L.block.count > L.block.rows.length && (
                  <p className="border-t border-border pt-3 text-[13px] text-gray-500">
                    Showing {L.block.rows.length} of {L.block.count}
                  </p>
                )}
              </section>
            ))}
          </div>
        </>
      )}
    </>
  )
}
