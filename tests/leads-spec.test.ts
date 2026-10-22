import { describe, expect, it } from 'vitest'
import { parseLeadsParams } from '@/lib/leads/params'
import { cleanRules, enumOptions, newRule, sameSpec, FIELDS, OPS } from '@/lib/leads/spec'
import { DEFAULT_VIEWS, staleHref, type Rule } from '@/lib/views'
import { LEAD_STATUSES, STAGES } from '@/lib/stages'

const views = DEFAULT_VIEWS
const enc = (v: unknown) => JSON.stringify(v)

describe('parseLeadsParams', () => {
  it('a bare /leads applies the default view', () => {
    const p = parseLeadsParams({}, views)
    expect(p.view).toBe('All active')
    expect(p.dirty).toBe(false)
    expect(p.rules).toEqual(views[0].rules)
    expect(p.page).toBe(1)
  })

  it('a named view loads its rules and sorts', () => {
    const p = parseLeadsParams({ view: 'Hot only' }, views)
    expect(p.view).toBe('Hot only')
    expect(p.rules).toHaveLength(2)
    expect(p.dirty).toBe(false)
  })

  it('explicit filters without a view name are view-less (no default view leaks in)', () => {
    const p = parseLeadsParams({ f: enc([]), s: enc([]) }, views)
    expect(p.view).toBeNull()
    expect(p.rules).toEqual([])
    expect(p.dirty).toBe(false)
  })

  it('edits on top of a view are dirty; identical f/s are not', () => {
    const edited = parseLeadsParams({ view: 'Hot only', f: enc([{ field: 'days', op: 'gte', value: '3' }]) }, views)
    expect(edited.dirty).toBe(true)
    const same = parseLeadsParams({ view: 'Hot only', f: enc(views[1].rules), s: enc(views[1].sorts) }, views)
    expect(same.dirty).toBe(false)
  })

  it('an unknown view name does not fall back to the default', () => {
    const p = parseLeadsParams({ view: 'Nope' }, views)
    expect(p.view).toBeNull()
    expect(p.rules).toEqual([])
  })

  it('malformed JSON and bad sort keys are ignored, not fatal', () => {
    const p = parseLeadsParams({ f: '{not json', s: enc([{ k: 'drop', dir: 'up' }]), page: 'abc' }, views)
    expect(p.rules).toEqual(views[0].rules) // f ignored -> falls back to the default view
    expect(p.sorts).toEqual(views[0].sorts)
    expect(p.page).toBe(1)
  })

  it('clamps page numbers', () => {
    expect(parseLeadsParams({ page: '0' }, views).page).toBe(1)
    expect(parseLeadsParams({ page: '-5' }, views).page).toBe(1)
    expect(parseLeadsParams({ page: '3' }, views).page).toBe(3)
    expect(parseLeadsParams({ page: '999999999' }, views).page).toBe(100000)
  })

  it('rejects more than 10 rules', () => {
    const many = Array.from({ length: 11 }, () => ({ field: 'temp', op: 'eq', value: 'Hot' }))
    expect(parseLeadsParams({ f: enc(many) }, views).rules).toEqual(views[0].rules)
  })

  it('drops operators that do not fit the field type', () => {
    const p = parseLeadsParams({ f: enc([{ field: 'temp', op: 'gte', value: 'Hot' }, { field: 'days', op: 'gte', value: '5' }]) }, views)
    expect(p.rules).toEqual([{ field: 'days', op: 'gte', value: '5' }])
  })
})

describe('spec helpers', () => {
  it('newRule defaults to the first operator and first option', () => {
    expect(newRule('temp', [])).toEqual({ field: 'temp', op: 'eq', value: 'Hot' })
    expect(newRule('days', [])).toEqual({ field: 'days', op: 'gte', value: '' })
    expect(newRule('q', [])).toEqual({ field: 'q', op: 'has', value: '' })
    expect(newRule('agent', [{ id: 'a1', label: 'Sandra' }]).value).toBe('a1')
    expect(newRule('agent', []).value).toBe('')
  })

  it('enum options cover statuses, stages and agents', () => {
    expect(enumOptions('temp', []).map((o) => o.v)).toEqual([...LEAD_STATUSES])
    expect(enumOptions('stage', [])).toHaveLength(STAGES.length)
    expect(enumOptions('status', []).map((o) => o.v)).toEqual(['Active', 'Closed', 'Lost / dead'])
    expect(enumOptions('days', [])).toEqual([])
  })

  it('every field has operators defined for its type', () => {
    for (const f of Object.values(FIELDS)) expect(OPS[f.type].length).toBeGreaterThan(0)
  })

  it('cleanRules / sameSpec', () => {
    const r: Rule[] = [{ field: 'q', op: 'eq', value: 'x' }]
    expect(cleanRules(r)).toEqual([])
    expect(sameSpec({ rules: [], sorts: [] }, { rules: [], sorts: [] })).toBe(true)
    expect(sameSpec({ rules: [], sorts: [] }, { rules: [], sorts: [{ k: 'days', dir: 'asc' }] })).toBe(false)
  })

  it('staleHref builds explicit filters for the configured threshold', () => {
    const url = new URL('http://x' + staleHref(10))
    expect(JSON.parse(url.searchParams.get('f')!)).toContainEqual({ field: 'days', op: 'gte', value: '10' })
    expect(url.searchParams.get('view')).toBeNull()
  })
})
