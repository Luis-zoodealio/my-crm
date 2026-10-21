'use client'

import { useId, useRef, type ReactNode } from 'react'
import { Button } from '@/components/Button'
import { useDialogFocus } from '@/components/useDialogFocus'

export function Modal({
  title,
  onClose,
  children,
  width = 460,
  z = 50,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  width?: number
  z?: number
}) {
  const titleId = useId()
  const ref = useRef<HTMLDivElement>(null)
  useDialogFocus(ref, onClose)

  return (
    <div onClick={onClose} className="fixed inset-0 flex items-center justify-center bg-ink/50 p-5" style={{ zIndex: z }}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-full max-w-full flex-col gap-[18px] overflow-y-auto rounded-2xl bg-white p-[26px] shadow-lg outline-none"
        style={{ width }}
      >
        <div className="flex items-center justify-between">
          <h2 id={titleId} className="text-[22px] font-bold tracking-[-0.03em]">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="cursor-pointer px-1 text-[22px] text-gray-500">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function ConfirmDialog({
  detail,
  confirmLabel = 'Delete',
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  detail: string
  confirmLabel?: string
  busy?: boolean
  error?: string
  onCancel: () => void
  onConfirm: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useDialogFocus(ref, onCancel)

  return (
    <div onClick={onCancel} className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/50 p-5">
      <div
        ref={ref}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={`${titleId}-detail`}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="flex w-[400px] max-w-full flex-col gap-3.5 rounded-2xl bg-white p-[26px] shadow-lg outline-none"
      >
        <h2 id={titleId} className="text-xl font-bold tracking-[-0.03em]">Are you sure you want to delete?</h2>
        <p id={`${titleId}-detail`} className="text-sm leading-normal text-gray-700">{detail}</p>
        {error && <p role="alert" className="text-sm text-magenta-bright">{error}</p>}
        <div className="mt-1.5 flex justify-end gap-2.5">
          {/* Cancel takes focus first: the safe default for a destructive prompt. */}
          <Button variant="outline" onClick={onCancel} data-autofocus>Cancel</Button>
          <Button onClick={onConfirm} disabled={busy}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}
