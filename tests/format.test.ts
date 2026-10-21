import { describe, expect, it } from 'vitest'
import { compactMoney, dueLabel, fullAddress, lastContactLabel, money, plural } from '@/lib/format'

describe('money', () => {
  it('formats whole dollars with separators', () => expect(money(398000)).toBe('$398,000'))
  it('shows a dash when there is no offer', () => {
    expect(money(null)).toBe('—')
    expect(money(undefined)).toBe('—')
  })
  it('keeps zero as $0, not a dash', () => expect(money(0)).toBe('$0'))
})

describe('compactMoney', () => {
  it('uses K under a million', () => expect(compactMoney(520000)).toBe('$520K'))
  it('uses M with trimmed decimals', () => {
    expect(compactMoney(1_000_000)).toBe('$1M')
    expect(compactMoney(1_660_000)).toBe('$1.66M')
    expect(compactMoney(2_538_000)).toBe('$2.54M')
  })
  it('shows a dash for null', () => expect(compactMoney(null)).toBe('—'))
})

describe('fullAddress', () => {
  it('joins street, city and state + zip', () => {
    expect(fullAddress({ address: '218 Cedar Ave', city: 'Dallas', state: 'TX', zip: '75208' })).toBe('218 Cedar Ave, Dallas, TX 75208')
  })
  it('skips missing parts without stray commas', () => {
    expect(fullAddress({ address: '5 Main St', city: null, state: null, zip: null })).toBe('5 Main St')
    expect(fullAddress({ address: '5 Main St', city: 'Austin', state: null, zip: '78701' })).toBe('5 Main St, Austin, 78701')
  })
})

describe('plural / lastContactLabel', () => {
  it('pluralizes', () => {
    expect(plural(1, 'follow-up')).toBe('1 follow-up')
    expect(plural(2, 'follow-up')).toBe('2 follow-ups')
    expect(plural(0, 'deal')).toBe('0 deals')
  })
  it('labels contact recency', () => {
    expect(lastContactLabel(0, false)).toBe('Today')
    expect(lastContactLabel(3, false)).toBe('3d ago')
    expect(lastContactLabel(8, true)).toBe('8d, stale')
  })
})

describe('dueLabel', () => {
  const now = new Date('2026-10-21T18:00:00Z')
  it('renders in the given time zone, not the server zone', () => {
    // 2026-10-22 14:00 UTC is 9:00 AM in Chicago (CDT) and 10:00 AM in New York (EDT)
    const d = new Date('2026-10-22T14:00:00Z')
    expect(dueLabel(d, 'America/Chicago', now)).toBe('Oct 22, 9:00 AM')
    expect(dueLabel(d, 'America/New_York', now)).toBe('Oct 22, 10:00 AM')
  })
  it('can land on a different calendar day per zone', () => {
    const d = new Date('2026-10-22T03:30:00Z') // 10:30 PM on the 21st in Chicago
    expect(dueLabel(d, 'America/Chicago', now)).toBe('Oct 21, 10:30 PM')
    expect(dueLabel(d, 'UTC', now)).toBe('Oct 22, 3:30 AM')
  })
  it('adds the year only when it differs from the current one', () => {
    expect(dueLabel(new Date('2027-01-05T15:00:00Z'), 'UTC', now)).toBe('Jan 5, 2027, 3:00 PM')
  })
})
