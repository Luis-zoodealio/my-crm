import { requireUser } from '@/lib/auth'
import { COMMON_ZONES, timeZoneNames } from '@/lib/settings/timezones'
import { SettingsForm } from './SettingsForm'

export const metadata = { title: 'Settings · Zoodealio CRM' }

export default async function SettingsPage() {
  const user = await requireUser()
  const all = timeZoneNames()
  const zones = [...COMMON_ZONES.filter((z) => all.includes(z)), ...all.filter((z) => !COMMON_ZONES.includes(z))]
  return (
    <>
      <h1 className="text-2xl font-bold tracking-[-0.03em]">Settings</h1>
      <SettingsForm initial={user.settings} zones={zones} commonCount={COMMON_ZONES.filter((z) => all.includes(z)).length} />
    </>
  )
}
