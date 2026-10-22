import { describe, expect, it } from 'vitest'
import { parseLimits } from '@/lib/tasks/query'
import { GROUP_PAGE } from '@/lib/tasks/groups'
import { LAST_ACTIVE_STAGE, LEAD_STATUS_COLORS, LEAD_STATUSES, STAGES, UNDER_CONTRACT_STAGES } from '@/lib/stages'

describe('parseLimits', () => {
  it('defaults every group to one page', () => {
    expect(parseLimits({})).toEqual({ overdue: GROUP_PAGE, today: GROUP_PAGE, upcoming: GROUP_PAGE, completed: GROUP_PAGE })
  })
  it('accepts larger limits, ignores junk, clamps to 1000', () => {
    expect(parseLimits({ overdue: '50' }).overdue).toBe(50)
    expect(parseLimits({ overdue: 'abc' }).overdue).toBe(GROUP_PAGE)
    expect(parseLimits({ overdue: '-10' }).overdue).toBe(GROUP_PAGE)
    expect(parseLimits({ upcoming: '999999' }).upcoming).toBe(1000)
    expect(parseLimits({ today: ['75', '5'] }).today).toBe(75)
  })
})

describe('stage model (matches the README)', () => {
  it('has 12 stages in order', () => {
    expect(STAGES.map((s) => s.name)).toEqual([
      'Comping complete', 'Comping viewed', 'Agent disputed comps', 'Details requested', 'Offer ready', 'Details shared',
      'Agent countered', 'Offer selected', 'Under contract', 'Inspection period', 'Closed', 'Lost / dead',
    ])
  })
  it('active is stages 0-9; under contract is 8-9', () => {
    expect(LAST_ACTIVE_STAGE).toBe(9)
    expect([...UNDER_CONTRACT_STAGES]).toEqual([8, 9])
  })
  it('stage colors and lead status colors match the design tokens', () => {
    expect(STAGES.map((s) => s.color)).toEqual(['#a1a1aa', '#a1a1aa', '#f59e0b', '#71717a', '#3b82f6', '#3b82f6', '#f59e0b', '#e11d74', '#ac0a55', '#8e0746', '#10b981', '#3f3f46'])
    expect(LEAD_STATUS_COLORS.Hot).toEqual({ bg: '#fbe6f0', fg: '#ac0a55' })
    expect(LEAD_STATUS_COLORS.Warm).toEqual({ bg: '#fff4e5', fg: '#b45309' })
    expect(LEAD_STATUS_COLORS.Cold).toEqual({ bg: '#e6f0fe', fg: '#1d4ed8' })
    expect(LEAD_STATUS_COLORS.Dead).toEqual({ bg: '#e4e4e7', fg: '#3f3f46' })
    expect(LEAD_STATUSES).toHaveLength(4)
  })
})
