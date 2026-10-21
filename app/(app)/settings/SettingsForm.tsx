'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/Button'
import { updateSettings } from '@/lib/settings/actions'

const fieldClass = 'rounded-sm border border-border bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-magenta aria-[invalid=true]:border-magenta-bright'

export function SettingsForm({ initial, zones, commonCount }: { initial: { staleDays: number; timezone: string }; zones: string[]; commonCount: number }) {
  const [staleDays, setStaleDays] = useState(String(initial.staleDays))
  const [timezone, setTimezone] = useState(initial.timezone)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [saved, setSaved] = useState(false)
  const [pending, start] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})
    setFormError('')
    setSaved(false)
    start(async () => {
      const res = await updateSettings({ staleDays, timezone })
      if (res.ok) return setSaved(true)
      setErrors(res.fieldErrors ?? {})
      setFormError(res.error)
    })
  }

  return (
    <form onSubmit={submit} className="flex max-w-[560px] flex-col gap-5 rounded-xl border border-border bg-white p-6">
      <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
        Stale after (days without contact)
        <input
          type="number"
          min={1}
          max={365}
          step={1}
          inputMode="numeric"
          value={staleDays}
          onChange={(e) => { setStaleDays(e.target.value); setSaved(false) }}
          aria-invalid={!!errors.staleDays}
          aria-describedby="stale-help"
          className={`${fieldClass} w-32`}
        />
        {errors.staleDays && <span role="alert" className="text-[13px] font-medium text-magenta-bright">{errors.staleDays}</span>}
        <span id="stale-help" className="text-[13px] font-normal text-gray-500">
          Active deals with no contact for this long are flagged as stale on the Dashboard, Leads and Board.
        </span>
      </label>

      <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
        Time zone
        <select value={timezone} onChange={(e) => { setTimezone(e.target.value); setSaved(false) }} aria-invalid={!!errors.timezone} aria-describedby="tz-help" className={fieldClass}>
          <optgroup label="United States">
            {zones.slice(0, commonCount).map((z) => <option key={z} value={z}>{z.replace(/_/g, ' ')}</option>)}
          </optgroup>
          <optgroup label="All time zones">
            {zones.slice(commonCount).map((z) => <option key={z} value={z}>{z.replace(/_/g, ' ')}</option>)}
          </optgroup>
        </select>
        {errors.timezone && <span role="alert" className="text-[13px] font-medium text-magenta-bright">{errors.timezone}</span>}
        <span id="tz-help" className="text-[13px] font-normal text-gray-500">
          Decides what counts as &ldquo;today&rdquo; and &ldquo;overdue&rdquo;, and the times you enter for follow-ups and tasks.
        </span>
      </label>

      {formError && !Object.keys(errors).length && <p role="alert" className="text-sm text-magenta-bright">{formError}</p>}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save settings'}</Button>
        {saved && <span role="status" className="text-sm font-semibold text-green-deep">Saved</span>}
      </div>
    </form>
  )
}
