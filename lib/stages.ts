export const STAGES = [
  { name: 'Comping complete', color: '#a1a1aa' },
  { name: 'Comping viewed', color: '#a1a1aa' },
  { name: 'Agent disputed comps', color: '#f59e0b' },
  { name: 'Details requested', color: '#71717a' },
  { name: 'Offer ready', color: '#3b82f6' },
  { name: 'Details shared', color: '#3b82f6' },
  { name: 'Agent countered', color: '#f59e0b' },
  { name: 'Offer selected', color: '#e11d74' },
  { name: 'Under contract', color: '#ac0a55' },
  { name: 'Inspection period', color: '#8e0746' },
  { name: 'Closed', color: '#10b981' },
  { name: 'Lost / dead', color: '#3f3f46' },
] as const

/** Stages 0-9 are active; Closed (10) and Lost / dead (11) are not. */
export const LAST_ACTIVE_STAGE = 9
export const UNDER_CONTRACT_STAGES = [8, 9] as const

export const LEAD_STATUSES = ['Hot', 'Warm', 'Cold', 'Dead'] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]

export const LEAD_STATUS_COLORS: Record<LeadStatus, { bg: string; fg: string }> = {
  Hot: { bg: '#fbe6f0', fg: '#ac0a55' },
  Warm: { bg: '#fff4e5', fg: '#b45309' },
  Cold: { bg: '#e6f0fe', fg: '#1d4ed8' },
  Dead: { bg: '#e4e4e7', fg: '#3f3f46' },
}

export const CONTACT_METHODS = ['Call', 'Text', 'Email', 'Voicemail', 'Zoom'] as const
