'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/Button'
import { ConfirmDialog } from '@/components/Modal'
import { createCadence, deleteCadence, updateCadence } from '@/lib/cadences/actions'
import type { Cadence } from '@/lib/cadences/query'
import { CONTACT_METHODS } from '@/lib/stages'

type Method = (typeof CONTACT_METHODS)[number]
type Step = { days: number; method: Method }

export function CadencesEditor({ initial }: { initial: Cadence[] }) {
  return (
    <section className="flex max-w-[640px] flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold tracking-[-0.02em]">Follow-up cadences</h2>
        <p className="text-sm text-gray-500">
          Named sequences of touches. Apply one to a deal and the CRM pre-fills each next step for you to confirm — it stops after the last step. Each step is &ldquo;wait N days, then reach out by&hellip;&rdquo;.
        </p>
      </div>
      {initial.map((c) => (
        <CadenceCard key={c.id} cadence={c} />
      ))}
      <CadenceCard cadence={null} />
    </section>
  )
}

function CadenceCard({ cadence }: { cadence: Cadence | null }) {
  const isNew = cadence === null
  const [name, setName] = useState(cadence?.name ?? '')
  const [steps, setSteps] = useState<Step[]>((cadence?.steps as Step[]) ?? [{ days: 2, method: 'Text' }])
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [pending, start] = useTransition()

  const touch = () => setSaved(false)
  const setStep = (i: number, patch: Partial<Step>) => { setSteps((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x))); touch() }
  const addStep = () => { setSteps((s) => [...s, { days: 7, method: 'Call' }]); touch() }
  const removeStep = (i: number) => { setSteps((s) => s.filter((_, j) => j !== i)); touch() }

  const save = () =>
    start(async () => {
      setError('')
      setSaved(false)
      const res = isNew ? await createCadence({ name, steps }) : await updateCadence(cadence!.id, { name, steps })
      if (!res.ok) return setError(res.error)
      setSaved(true)
      if (isNew) {
        setName('')
        setSteps([{ days: 2, method: 'Text' }])
      }
    })

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-white p-5">
      <input
        value={name}
        onChange={(e) => { setName(e.target.value); touch() }}
        placeholder={isNew ? 'New cadence name (e.g. Standard agent follow-up)' : 'Cadence name'}
        className="rounded-sm border border-border px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-magenta"
      />
      <div className="flex flex-col gap-2">
        {steps.map((st, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="w-[52px] font-semibold text-gray-700">Step {i + 1}</span>
            <span className="text-gray-500">wait</span>
            <input
              type="number"
              min={0}
              max={365}
              value={st.days}
              onChange={(e) => setStep(i, { days: Number(e.target.value) })}
              className="w-16 rounded-sm border border-border px-2 py-1.5 text-sm outline-none focus:border-magenta"
            />
            <span className="text-gray-500">days, then</span>
            <select value={st.method} onChange={(e) => setStep(i, { method: e.target.value as Method })} className="rounded-sm border border-border px-2 py-1.5 text-sm outline-none focus:border-magenta">
              {CONTACT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            {steps.length > 1 && (
              <button type="button" onClick={() => removeStep(i)} aria-label={`Remove step ${i + 1}`} className="cursor-pointer px-1 text-lg leading-none text-gray-500 hover:text-magenta">×</button>
            )}
          </div>
        ))}
        <button type="button" onClick={addStep} className="w-fit cursor-pointer text-sm font-bold text-magenta">+ Add step</button>
      </div>
      {error && <p role="alert" className="text-sm text-magenta-bright">{error}</p>}
      <div className="flex items-center gap-3">
        <Button size="xs" onClick={save} disabled={pending || !name.trim()}>{pending ? 'Saving…' : isNew ? 'Create cadence' : 'Save'}</Button>
        {!isNew && <Button size="xs" variant="outline" disabled={pending} onClick={() => { setError(''); setConfirm(true) }}>Delete</Button>}
        {saved && <span role="status" className="text-sm font-semibold text-green-deep">Saved</span>}
      </div>
      {confirm && cadence && (
        <ConfirmDialog
          detail={`Delete "${cadence.name}"? Deals using it keep their history but come off the cadence.`}
          busy={pending}
          error={error}
          onCancel={() => setConfirm(false)}
          onConfirm={() => start(async () => { const res = await deleteCadence(cadence.id); if (!res.ok) setError(res.error); else setConfirm(false) })}
        />
      )}
    </div>
  )
}
