export function money(n: number | null | undefined): string {
  return n == null ? '—' : '$' + Math.round(n).toLocaleString('en-US')
}

/** $520K, $1.2M */
export function compactMoney(n: number | null | undefined): string {
  if (n == null) return '—'
  return n >= 1e6 ? '$' + (n / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M' : '$' + Math.round(n / 1000) + 'K'
}

export function fullAddress(d: { address: string; city: string | null; state: string | null; zip: string | null }): string {
  const region = [d.state, d.zip].filter(Boolean).join(' ')
  return [d.address, d.city, region].filter(Boolean).join(', ')
}

export function plural(n: number, one: string, many = one + 's'): string {
  return `${n} ${n === 1 ? one : many}`
}

export function dateLine(timezone: string, now = new Date()): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: timezone }).format(now)
}

/** "Oct 21, 9:00 AM" (adds the year when it isn't the current one), in the given timezone. */
export function dueLabel(d: Date, timezone: string, now = new Date()): string {
  const year = (x: Date) => new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: timezone }).format(x)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    ...(year(d) === year(now) ? {} : { year: 'numeric' }),
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone,
  }).format(d)
}

/** "Today", "3d ago", or "8d, stale" (stale only applies to active deals). */
export function lastContactLabel(days: number, stale: boolean): string {
  return days === 0 ? 'Today' : stale ? `${days}d, stale` : `${days}d ago`
}

/** "Oct 20th" — abbreviated month + ordinal day in the user's timezone. */
export function lastContactDate(isoStr: string, timezone: string): string {
  const d = new Date(isoStr)
  const month = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: timezone }).format(d)
  const day = Number(new Intl.DateTimeFormat('en-US', { day: 'numeric', timeZone: timezone }).format(d))
  const v = day % 100
  const sfx = (v >= 11 && v <= 13) ? 'th' : ['th', 'st', 'nd', 'rd'][day % 10] ?? 'th'
  return `${month} ${day}${sfx}`
}
