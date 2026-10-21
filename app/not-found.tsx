import { ButtonLink } from '@/components/Button'

export const metadata = { title: 'Page not found · Zoodealio CRM' }

export default function NotFound() {
  return (
    <main className="mx-auto mt-[15vh] flex max-w-[520px] flex-col items-start gap-3 rounded-xl border border-border bg-white p-6 shadow-sm">
      <h1 className="text-lg font-bold">Page not found</h1>
      <p className="text-[15px] leading-normal text-gray-700">That page doesn&apos;t exist, or the link is wrong.</p>
      <ButtonLink href="/dashboard">Go to Dashboard</ButtonLink>
    </main>
  )
}
