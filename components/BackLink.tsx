'use client'

import { useRouter } from 'next/navigation'

/** Goes back in history when there is some (keeps filters and scroll), otherwise to the fallback page. */
export function BackLink({ label, fallback }: { label: string; fallback: string }) {
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}
      className="w-fit cursor-pointer text-sm font-bold text-magenta hover:text-magenta-dark"
    >
      {'←'} Back to {label}
    </button>
  )
}
