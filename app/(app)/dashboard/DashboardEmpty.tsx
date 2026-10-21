import { ButtonLink } from '@/components/Button'

export function DashboardEmpty() {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-border bg-white p-6 shadow-sm">
      <span className="text-lg font-bold">No deals yet</span>
      <p className="max-w-[460px] text-[15px] leading-normal text-gray-700">
        Add your first deal to start tracking offers, notes and follow-ups. Your dashboard fills in as deals move through the pipeline.
      </p>
      <ButtonLink href="/deals/new">+ Add deal</ButtonLink>
    </div>
  )
}
