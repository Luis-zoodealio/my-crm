// Filter / sort spec for the Leads screen. Pure and shared by server and client.
import { LEAD_STATUSES, STAGES } from '@/lib/stages'
import type { Rule, ViewSpec } from '@/lib/views'

export const FIELD_KEYS = ['status', 'temp', 'stage', 'days', 'offer', 'fu', 'agent', 'q'] as const
export type FieldKey = (typeof FIELD_KEYS)[number]
export type FieldType = 'enum' | 'num' | 'text'

export const STATUS_OPTIONS = ['Active', 'Closed', 'Lost / dead'] as const

export const FIELDS: Record<FieldKey, { label: string; type: FieldType; unit?: string }> = {
  status: { label: 'Status', type: 'enum' },
  temp: { label: 'Lead status', type: 'enum' },
  stage: { label: 'Stage', type: 'enum' },
  days: { label: 'Days since last contact', type: 'num', unit: 'days' },
  offer: { label: 'Offer (Cash)', type: 'num', unit: 'dollars' },
  fu: { label: 'Follow-up (days from today)', type: 'num', unit: 'days, negative = overdue' },
  agent: { label: 'Agent', type: 'enum' },
  q: { label: 'Address or agent', type: 'text' },
}

export const OPS: Record<FieldType, [string, string][]> = {
  enum: [['eq', 'is'], ['ne', 'is not']],
  num: [['gte', 'at least'], ['lte', 'at most'], ['eq', 'exactly']],
  text: [['has', 'contains']],
}

export const SORT_KEYS = ['temp', 'stage', 'days', 'offer', 'fu', 'agent', 'addr'] as const
export type SortKey = (typeof SORT_KEYS)[number]

export const SORTS: Record<SortKey, { label: string; dirLabels: [string, string] }> = {
  temp: { label: 'Lead status', dirLabels: ['Hot first', 'Dead first'] },
  stage: { label: 'Stage', dirLabels: ['Earliest stage first', 'Latest stage first'] },
  days: { label: 'Last contact', dirLabels: ['Most recent first', 'Longest ago first'] },
  offer: { label: 'Offer', dirLabels: ['Low to high', 'High to low'] },
  fu: { label: 'Follow-up date', dirLabels: ['Soonest first', 'Latest first'] },
  agent: { label: 'Agent', dirLabels: ['A to Z', 'Z to A'] },
  addr: { label: 'Address', dirLabels: ['A to Z', 'Z to A'] },
}

export const PAGE_SIZE = 25
export const MAX_RULES = 10
export const DEFAULT_VIEW_NAME = 'All active'

/** Drop rules whose operator doesn't fit the field type. */
export function cleanRules(rules: Rule[]): Rule[] {
  return rules.filter((r) => OPS[FIELDS[r.field as FieldKey].type].some(([op]) => op === r.op))
}

export function enumOptions(field: FieldKey, agents: { id: string; label: string }[]): { v: string; l: string }[] {
  switch (field) {
    case 'status': return STATUS_OPTIONS.map((o) => ({ v: o, l: o }))
    case 'temp': return LEAD_STATUSES.map((o) => ({ v: o, l: o }))
    case 'stage': return STAGES.map((s) => ({ v: s.name, l: s.name }))
    case 'agent': return agents.map((a) => ({ v: a.id, l: a.label }))
    default: return []
  }
}

export function newRule(field: FieldKey, agents: { id: string; label: string }[]): Rule {
  const type = FIELDS[field].type
  return { field, op: OPS[type][0][0], value: type === 'enum' ? (enumOptions(field, agents)[0]?.v ?? '') : '' }
}

export const sameSpec = (a: Pick<ViewSpec, 'rules' | 'sorts'>, b: Pick<ViewSpec, 'rules' | 'sorts'>) =>
  JSON.stringify([a.rules, a.sorts]) === JSON.stringify([b.rules, b.sorts])
