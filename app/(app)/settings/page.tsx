import { requireUser } from '@/lib/auth'
import { listCadences } from '@/lib/cadences/query'
import { COMMON_ZONES, timeZoneNames } from '@/lib/settings/timezones'
import { CadencesEditor } from './CadencesEditor'
import { SettingsForm } from './SettingsForm'

export const metadata = { title: 'Settings · Zoodealio CRM' }

export default async function SettingsPage() {
  const user = await requireUser()
  const all = timeZoneNames()
  const zones = [...COMMON_ZONES.filter((z) => all.includes(z)), ...all.filter((z) => !COMMON_ZONES.includes(z))]
  const cadences = await listCadences(user.id)
  return (
    <>
      <h1 className="text-2xl font-bold tracking-[-0.03em]">Settings</h1>
      <SettingsForm initial={user.settings} zones={zones} commonCount={COMMON_ZONES.filter((z) => all.includes(z)).length} />
      <CadencesEditor initial={cadences} />
    </>
  )
}
