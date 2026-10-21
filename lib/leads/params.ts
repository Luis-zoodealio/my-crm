// Server-side parsing/validation of Leads URL state and saved views (uses zod).
import 'server-only'
import { z } from 'zod'
import type { Rule, Sort, ViewSpec } from '@/lib/views'
import { cleanRules, DEFAULT_VIEW_NAME, FIELD_KEYS, MAX_RULES, SORT_KEYS, sameSpec } from './spec'

export const RuleSchema = z.object({
  field: z.enum(FIELD_KEYS),
  op: z.string().max(8),
  value: z.string().max(200),
})
export const SortSchema = z.object({ k: z.enum(SORT_KEYS), dir: z.enum(['asc', 'desc']) })
export const RulesSchema = z.array(RuleSchema).max(MAX_RULES)
export const SortsSchema = z.array(SortSchema).max(SORT_KEYS.length)

export type LeadsParams = {
  rules: Rule[]
  sorts: Sort[]
  view: string | null
  /** True when f/s in the URL differ from the named view. */
  dirty: boolean
  page: number
}

type Raw = Record<string, string | string[] | undefined>
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

function parseJson<T>(raw: string | undefined, schema: z.ZodType<T>): T | undefined {
  if (raw === undefined) return undefined
  try {
    const r = schema.safeParse(JSON.parse(raw))
    return r.success ? r.data : undefined
  } catch {
    return undefined
  }
}

/** URL -> spec. Unknown or malformed input falls back to the named (or default) view. */
export function parseLeadsParams(raw: Raw, views: ViewSpec[]): LeadsParams {
  const named = first(raw.view)
  const f = parseJson(first(raw.f), RulesSchema)
  const s = parseJson(first(raw.s), SortsSchema)
  // The default view applies only to a bare /leads. Explicit filters/sorts without a view name stay view-less.
  const viewSpec = named
    ? views.find((v) => v.name === named)
    : f === undefined && s === undefined
      ? views.find((v) => v.name === DEFAULT_VIEW_NAME)
      : undefined
  const base = viewSpec ?? { name: null, rules: [] as Rule[], sorts: [] as Sort[] }
  const rules = cleanRules(f ?? base.rules)
  const sorts = s ?? base.sorts
  const page = Math.max(1, Math.min(100000, Number.parseInt(first(raw.page) ?? '1', 10) || 1))
  return {
    rules,
    sorts,
    view: viewSpec?.name ?? null,
    dirty: !!viewSpec && (f !== undefined || s !== undefined) && !sameSpec(viewSpec, { rules, sorts }),
    page,
  }
}
