import { describe, expect, it } from 'vitest'
import { SettingsInput } from '@/lib/settings/schema'
import { COMMON_ZONES, timeZoneNames } from '@/lib/settings/timezones'

const ok = (staleDays: unknown, timezone = 'America/Chicago') => SettingsInput.safeParse({ staleDays, timezone })

describe('settings validation', () => {
  it('accepts 1 to 365 whole days, as numbers or strings', () => {
    expect(ok(1).success).toBe(true)
    expect(ok('7').success).toBe(true)
    expect(ok(365).success).toBe(true)
  })
  it('rejects 0, negatives, over a year, decimals and junk', () => {
    for (const bad of [0, -3, 366, 2.5, 'abc', '', null]) expect(ok(bad).success, String(bad)).toBe(false)
  })
  it('gives readable messages', () => {
    expect(ok(0).error?.issues[0].message).toBe('Use at least 1 day.')
    expect(ok(400).error?.issues[0].message).toBe('Use 365 days or fewer.')
    expect(ok(2.5).error?.issues[0].message).toBe('Use a whole number of days.')
  })
  it('only accepts real IANA time zones', () => {
    expect(ok(7, 'America/New_York').success).toBe(true)
    expect(ok(7, 'UTC').success).toBe(true)
    expect(ok(7, 'Mars/Olympus_Mons').success).toBe(false)
    expect(ok(7, "x'; drop table crm.deals;--").success).toBe(false)
    expect(ok(7, '').success).toBe(false)
  })
  it('lists the common US zones first and they are all valid', () => {
    const all = timeZoneNames()
    for (const z of COMMON_ZONES) expect(all).toContain(z)
    expect(all).toContain('UTC')
  })
})
