import { ButtonLink } from '@/components/Button'

export default function NotFound() {
  return (
    <div className="flex max-w-[520px] flex-col items-start gap-3 rounded-xl border border-border bg-white p-6 shadow-sm">
      <span className="text-lg font-bold">Deal not found</span>
      <p className="text-[15px] leading-normal text-gray-700">It may have been deleted, or the link is wrong.</p>
      <ButtonLink href="/leads">Back to Leads</ButtonLink>
    </div>
  )
}
