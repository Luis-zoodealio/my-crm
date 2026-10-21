'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { Button } from '@/components/Button'
import { ConfirmDialog } from '@/components/Modal'
import { createDeal, deleteDeal, searchAgents, updateDeal, type DealInputType } from '@/lib/deals/actions'
import { LEAD_STATUSES, STAGES } from '@/lib/stages'

type AgentRef = { id: string; name: string; agency: string | null }

export type DealFormValues = {
  address: string
  city: string
  state: string
  zip: string
  stage: number
  leadStatus: string
  cashOffer: string
  cashPlusOffer: string
  agent: AgentRef | null
}

export const EMPTY_DEAL: DealFormValues = {
  address: '', city: '', state: '', zip: '', stage: 0, leadStatus: 'Warm', cashOffer: '', cashPlusOffer: '', agent: null,
}

const fieldClass = 'rounded-sm border border-border bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-magenta aria-[invalid=true]:border-magenta-bright'
const labelClass = 'flex flex-col gap-1.5 text-[13px] font-semibold'

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className={labelClass}>
      {label}
      {children}
      {error && <span role="alert" className="text-[13px] font-medium text-magenta-bright">{error}</span>}
    </label>
  )
}

export function DealForm({ mode, dealId, initial = EMPTY_DEAL }: { mode: 'create' | 'edit'; dealId?: string; initial?: DealFormValues }) {
  const router = useRouter()
  const [v, setV] = useState<DealFormValues>(initial)
  const [newAgent, setNewAgent] = useState<{ name: string; agency: string; phone: string; email: string } | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [pending, start] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const set = <K extends keyof DealFormValues>(k: K, val: DealFormValues[K]) => setV((s) => ({ ...s, [k]: val }))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})
    setFormError('')
    const agent: DealInputType['agent'] = newAgent
      ? { mode: 'new', ...newAgent }
      : v.agent
        ? { mode: 'existing', id: v.agent.id }
        : { mode: 'none' }
    const payload: DealInputType = {
      address: v.address, city: v.city, state: v.state, zip: v.zip, stage: v.stage, leadStatus: v.leadStatus as DealInputType['leadStatus'],
      cashOffer: v.cashOffer, cashPlusOffer: v.cashPlusOffer, agent,
    }
    start(async () => {
      const res = mode === 'create' ? await createDeal(payload) : await updateDeal(dealId!, payload)
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {})
        setFormError(res.error)
        return
      }
      router.push(`/deals/${res.id}`)
    })
  }

  function remove() {
    start(async () => {
      const res = await deleteDeal(dealId!)
      if (!res.ok) {
        setFormError(res.error)
        setConfirmDelete(false)
        return
      }
      router.push('/leads')
    })
  }

  return (
    <>
      <Link href={dealId ? `/deals/${dealId}` : '/leads'} className="w-fit text-sm font-bold">
        {'←'} {dealId ? 'Back to deal' : 'Back to Leads'}
      </Link>
      <h1 className="text-[32px] font-bold leading-[1.1] tracking-[-0.03em]">{mode === 'create' ? 'Add deal' : 'Edit deal'}</h1>

      <form onSubmit={submit} className="flex max-w-[760px] flex-col gap-5">
        <section className="flex flex-col gap-4 rounded-xl border border-border bg-white p-6">
          <h2 className="text-lg font-bold">Property</h2>
          <Field label="Street address" error={errors.address}>
            <input value={v.address} onChange={(e) => set('address', e.target.value)} required maxLength={200} aria-invalid={!!errors.address} autoFocus={mode === 'create'} placeholder="218 Cedar Ave" className={fieldClass} />
          </Field>
          <div className="grid grid-cols-[minmax(0,1fr)_100px_120px] gap-3">
            <Field label="City" error={errors.city}><input value={v.city} onChange={(e) => set('city', e.target.value)} maxLength={100} className={fieldClass} /></Field>
            <Field label="State" error={errors.state}><input value={v.state} onChange={(e) => set('state', e.target.value)} maxLength={20} className={fieldClass} /></Field>
            <Field label="ZIP" error={errors.zip}><input value={v.zip} onChange={(e) => set('zip', e.target.value)} maxLength={12} inputMode="numeric" className={fieldClass} /></Field>
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-xl border border-border bg-white p-6">
          <h2 className="text-lg font-bold">Pipeline</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Stage">
              <select value={v.stage} onChange={(e) => set('stage', Number(e.target.value))} className={fieldClass}>
                {STAGES.map((s, i) => <option key={s.name} value={i}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Lead status">
              <select value={v.leadStatus} onChange={(e) => set('leadStatus', e.target.value)} className={fieldClass}>
                {LEAD_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Cash offer ($)" error={errors.cashOffer}>
              <input type="number" min={0} step="1" inputMode="decimal" value={v.cashOffer} onChange={(e) => set('cashOffer', e.target.value)} aria-invalid={!!errors.cashOffer} placeholder="398000" className={fieldClass} />
            </Field>
            <Field label="Cash+ offer ($)" error={errors.cashPlusOffer}>
              <input type="number" min={0} step="1" inputMode="decimal" value={v.cashPlusOffer} onChange={(e) => set('cashPlusOffer', e.target.value)} aria-invalid={!!errors.cashPlusOffer} placeholder="429000" className={fieldClass} />
            </Field>
          </div>
          <p className="text-[13px] text-gray-500">Cash+ is stored exactly as you enter it. Leave an offer blank if you haven&apos;t made it yet.</p>
        </section>

        <section className="flex flex-col gap-4 rounded-xl border border-border bg-white p-6">
          <h2 className="text-lg font-bold">Listing agent</h2>
          {newAgent ? (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Name" error={errors.agent}><input value={newAgent.name} onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })} maxLength={120} className={fieldClass} /></Field>
                <Field label="Agency"><input value={newAgent.agency} onChange={(e) => setNewAgent({ ...newAgent, agency: e.target.value })} maxLength={120} className={fieldClass} /></Field>
                <Field label="Phone"><input value={newAgent.phone} onChange={(e) => setNewAgent({ ...newAgent, phone: e.target.value })} maxLength={40} type="tel" className={fieldClass} /></Field>
                <Field label="Email"><input value={newAgent.email} onChange={(e) => setNewAgent({ ...newAgent, email: e.target.value })} maxLength={160} type="email" className={fieldClass} /></Field>
              </div>
              <button type="button" onClick={() => setNewAgent(null)} className="w-fit cursor-pointer text-sm font-bold text-magenta">Pick an existing agent instead</button>
            </div>
          ) : v.agent ? (
            <div className="flex items-center justify-between gap-2.5 rounded-sm border border-border bg-bg px-3 py-2.5 text-sm">
              <span><span className="font-semibold">{v.agent.name}</span>{v.agent.agency ? ` · ${v.agent.agency}` : ''}</span>
              <button type="button" onClick={() => set('agent', null)} aria-label="Remove agent" className="cursor-pointer text-lg leading-none text-gray-500">×</button>
            </div>
          ) : (
            <AgentPicker onPick={(a) => set('agent', a)} onCreate={() => setNewAgent({ name: '', agency: '', phone: '', email: '' })} />
          )}
        </section>

        {formError && !Object.keys(errors).length && <p role="alert" className="text-sm text-magenta-bright">{formError}</p>}
        <div className="flex items-center gap-2.5">
          <Button type="submit" disabled={pending}>{pending ? 'Saving…' : mode === 'create' ? 'Add deal' : 'Save changes'}</Button>
          <Link href={dealId ? `/deals/${dealId}` : '/leads'} className="inline-flex rounded-md border border-border bg-white px-4 py-[9px] text-sm font-bold leading-none text-ink hover:border-magenta hover:text-magenta">Cancel</Link>
          {mode === 'edit' && (
            <button type="button" onClick={() => setConfirmDelete(true)} className="ml-auto cursor-pointer text-sm font-bold text-magenta-bright">Delete deal</button>
          )}
        </div>
      </form>

      {confirmDelete && (
        <ConfirmDialog
          detail={`${v.address}. This permanently deletes the deal along with its notes, property notes and tasks.`}
          busy={pending}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={remove}
        />
      )}
    </>
  )
}

function AgentPicker({ onPick, onCreate }: { onPick: (a: AgentRef) => void; onCreate: () => void }) {
  const [q, setQ] = useState('')
  const [found, setResults] = useState<AgentRef[] | null>(null)
  const results = q.trim() ? found : null

  // Server-side search, debounced.
  useEffect(() => {
    if (!q.trim()) return
    let stale = false
    const t = setTimeout(async () => {
      const r = await searchAgents(q).catch(() => [])
      if (!stale) setResults(r)
    }, 250)
    return () => {
      stale = true
      clearTimeout(t)
    }
  }, [q])

  return (
    <div className="flex flex-col gap-2">
      <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search agents" placeholder="Search by agent name or agency" className={fieldClass} />
      {results && results.length > 0 && (
        <div className="overflow-hidden rounded-sm border border-border">
          {results.map((a) => (
            <button key={a.id} type="button" onClick={() => onPick(a)} className="flex w-full cursor-pointer flex-col gap-px border-t border-border px-3 py-2.5 text-left first:border-t-0 hover:bg-bg">
              <span className="text-sm font-semibold">{a.name}</span>
              {a.agency && <span className="text-xs text-gray-500">{a.agency}</span>}
            </button>
          ))}
        </div>
      )}
      {results && results.length === 0 && <span className="text-[13px] text-gray-500">No matching agents.</span>}
      <button type="button" onClick={onCreate} className="w-fit cursor-pointer text-sm font-bold text-magenta">+ New agent</button>
    </div>
  )
}
