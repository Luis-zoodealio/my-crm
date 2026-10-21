import { LEAD_STATUS_COLORS, type LeadStatus } from '@/lib/stages'

export function LeadPill({ status, className = '' }: { status: string; className?: string }) {
  const c = LEAD_STATUS_COLORS[status as LeadStatus] ?? LEAD_STATUS_COLORS.Dead
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full px-[9px] py-[3px] text-xs font-bold ${className}`}
      style={{ background: c.bg, color: c.fg }}
    >
      <span className="size-1.5 rounded-full" style={{ background: c.fg }} />
      {status}
    </span>
  )
}
