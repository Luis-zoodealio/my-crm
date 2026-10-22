'use client'

import { useEffect } from 'react'
import { Button } from '@/components/Button'

// Next 16 passes `retry` (not `reset`) to error boundaries.
export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div role="alert" className="flex max-w-[520px] flex-col items-start gap-3 rounded-xl border border-border bg-white p-6 shadow-sm">
      <span className="text-lg font-bold">Something went wrong</span>
      <p className="text-[15px] leading-normal text-gray-700">
        We couldn&apos;t load this page. Your data is safe. Try again, and if it keeps happening let me know.
      </p>
      {error.digest && <span className="text-xs text-gray-500">Reference: {error.digest}</span>}
      <Button onClick={() => retry()}>Try again</Button>
    </div>
  )
}
