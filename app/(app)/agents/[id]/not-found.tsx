import { ButtonLink } from '@/components/Button'

export default function NotFound() {
  return (
    <div className="flex max-w-[520px] flex-col items-start gap-3 rounded-xl border border-border bg-white p-6 shadow-sm">
      <span className="text-lg font-bold">Agent not found</span>
      <p className="text-[15px] leading-normal text-gray-700">The agent may have been removed, or the link is wrong.</p>
      <ButtonLink href="/agents">Back to Agents</ButtonLink>
    </div>
  )
}
