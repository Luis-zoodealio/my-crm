/** IANA zone names the runtime knows, with UTC guaranteed present. Shared by the settings form and its action. */
export function timeZoneNames(): string[] {
  const names = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []
  return names.includes('UTC') ? names : ['UTC', ...names]
}

/** US zones first, since that is who this CRM is for; everything else follows alphabetically. */
export const COMMON_ZONES = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Phoenix', 'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu']
