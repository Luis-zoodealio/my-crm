import { Sidebar } from '@/components/Sidebar'
import { requireUser } from '@/lib/auth'
import { getNavCounts } from '@/lib/queries/nav'

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const user = await requireUser()
  const counts = await getNavCounts(user.id)

  return (
    <div className="flex min-h-screen bg-bg font-sans text-ink">
      <a
        href="#main"
        className="sr-only z-[100] rounded-md bg-white px-4 py-2 text-sm font-bold text-magenta shadow-lg focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <Sidebar counts={counts} staleDays={user.settings.staleDays} email={user.email} />
      <main id="main" tabIndex={-1} className="flex min-w-0 flex-1 flex-col gap-6 px-9 pb-12 pt-8 outline-none">{children}</main>
    </div>
  )
}
