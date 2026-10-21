'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/Button'
import { Modal } from '@/components/Modal'
import { updateAgent } from '@/lib/agents/actions'

type Values = { id: string; name: string; agency: string; phone: string; email: string }

const fieldClass = 'rounded-sm border border-border bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-magenta aria-[invalid=true]:border-magenta-bright'

export function AgentEdit({ agent }: { agent: Values }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="outline" size="xs" onClick={() => setOpen(true)} className="w-fit">Edit agent</Button>
      {open && <EditModal agent={agent} onClose={() => setOpen(false)} />}
    </>
  )
}

function EditModal({ agent, onClose }: { agent: Values; onClose: () => void }) {
  const [v, setV] = useState({ name: agent.name, agency: agent.agency, phone: agent.phone, email: agent.email })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [pending, start] = useTransition()
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV((s) => ({ ...s, [k]: e.target.value }))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})
    setFormError('')
    start(async () => {
      const res = await updateAgent(agent.id, v)
      if (res.ok) return onClose()
      setErrors(res.fieldErrors ?? {})
      setFormError(res.error)
    })
  }

  const Field = ({ k, label, type = 'text', max }: { k: keyof typeof v; label: string; type?: string; max: number }) => (
    <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
      {label}
      <input type={type} value={v[k]} onChange={set(k)} maxLength={max} aria-invalid={!!errors[k]} className={fieldClass} />
      {errors[k] && <span role="alert" className="text-[13px] font-medium text-magenta-bright">{errors[k]}</span>}
    </label>
  )

  return (
    <Modal title="Edit agent" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <p className="text-[13px] text-gray-500">Changes apply to every deal with this agent.</p>
        {Field({ k: 'name', label: 'Name', max: 120 })}
        {Field({ k: 'agency', label: 'Agency', max: 120 })}
        {Field({ k: 'phone', label: 'Phone', type: 'tel', max: 40 })}
        {Field({ k: 'email', label: 'Email', type: 'email', max: 160 })}
        {formError && !Object.keys(errors).length && <p role="alert" className="text-sm text-magenta-bright">{formError}</p>}
        <div className="flex justify-end gap-2.5">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save changes'}</Button>
        </div>
      </form>
    </Modal>
  )
}
