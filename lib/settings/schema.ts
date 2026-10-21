import { z } from 'zod'
import { timeZoneNames } from './timezones'

export const SettingsInput = z.object({
  staleDays: z.coerce.number('Enter a number of days.').int('Use a whole number of days.').min(1, 'Use at least 1 day.').max(365, 'Use 365 days or fewer.'),
  timezone: z.string().refine((tz) => timeZoneNames().includes(tz), 'Pick a time zone from the list.'),
})
