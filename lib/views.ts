// Saved-view shape shared by the Leads screen (built next) and the dashboard links.
// Field keys follow the prototype: status, temp, stage, days, offer, fu, agent, q.
export type Rule = { field: string; op: string; value: string }
export type Sort = { k: string; dir: 'asc' | 'desc' }
export type ViewSpec = { name: string; rules: Rule[]; sorts: Sort[] }

const active: Rule = { field: 'status', op: 'eq', value: 'Active' }

export const DEFAULT_VIEWS: ViewSpec[] = [
  { name: 'All active', rules: [active], sorts: [{ k: 'temp', dir: 'asc' }, { k: 'days', dir: 'desc' }] },
  { name: 'Hot only', rules: [active, { field: 'temp', op: 'eq', value: 'Hot' }], sorts: [{ k: 'days', dir: 'desc' }] },
  { name: 'Stale 7d+', rules: [active, { field: 'days', op: 'gte', value: '7' }], sorts: [{ k: 'days', dir: 'desc' }] },
  { name: 'Overdue follow-ups', rules: [active, { field: 'fu', op: 'lte', value: '-1' }], sorts: [{ k: 'fu', dir: 'asc' }] },
]

export const leadsViewHref = (name: string) => `/leads?view=${encodeURIComponent(name)}`

/** Leads filtered to active deals at or past the stale threshold, whatever the user has set it to. */
export const staleHref = (days: number) => {
  const rules: Rule[] = [active, { field: 'days', op: 'gte', value: String(days) }]
  const sorts: Sort[] = [{ k: 'days', dir: 'desc' }]
  return `/leads?${new URLSearchParams({ f: JSON.stringify(rules), s: JSON.stringify(sorts) })}`
}
