'use client'

import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Dialog keyboard behavior: focus moves in on open (a [data-autofocus] element, else the first field,
 * else the first control), Tab and Shift+Tab stay inside, Escape closes, and focus returns to
 * whatever opened the dialog.
 */
export function useDialogFocus(ref: RefObject<HTMLElement | null>, onEscape: () => void) {
  const escape = useRef(onEscape)
  useEffect(() => {
    escape.current = onEscape
  })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const opener = document.activeElement as HTMLElement | null
    const controls = () => [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => n.offsetParent !== null)

    const first = el.querySelector<HTMLElement>('[data-autofocus]') ?? el.querySelector<HTMLElement>('input, textarea, select') ?? controls()[0] ?? el
    first.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        escape.current()
        return
      }
      if (e.key !== 'Tab') return
      const list = controls()
      if (list.length === 0) {
        e.preventDefault()
        return
      }
      const active = document.activeElement
      if (e.shiftKey && (active === list[0] || active === el)) {
        e.preventDefault()
        list[list.length - 1].focus()
      } else if (!e.shiftKey && active === list[list.length - 1]) {
        e.preventDefault()
        list[0].focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      opener?.focus?.()
    }
  }, [ref])
}
