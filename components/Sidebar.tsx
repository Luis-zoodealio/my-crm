'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', badge: null },
  { href: '/leads', label: 'Leads', badge: 'leads' },
  { href: '/board', label: 'Board', badge: null },
  { href: '/tasks', label: 'Tasks', badge: 'tasks' },
  { href: '/agents', label: 'Agents', badge: null },
] as const

export function Sidebar({
  counts,
  staleDays,
  email,
}: {
  counts: { leads: number; tasks: number }
  staleDays: number
  email: string
}) {
  const pathname = usePathname()
  const router = useRouter()

  async function signOut() {
    await createClient().auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="sticky top-0 flex h-screen w-[232px] flex-none flex-col gap-7 bg-charcoal px-4 py-6 text-white">
      <div className="flex items-baseline gap-2 px-2.5">
        <span className="text-[22px] font-extrabold tracking-[-0.04em]">Zoodealio</span>
        <span className="text-xs font-bold text-magenta-bright">CRM</span>
      </div>
      <nav aria-label="Main" className="flex flex-col gap-1">
        {NAV.map((n) => {
          const active = pathname === n.href || pathname.startsWith(n.href + '/')
          const badge = n.badge ? counts[n.badge] : null
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center justify-between rounded-md px-3 py-[11px] text-[15px] font-semibold transition-colors ${
                active ? 'bg-[#ac0a55] text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span>{n.label}</span>
              {badge != null && <span className="text-xs font-bold opacity-90">{badge}</span>}
            </Link>
          )
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-2 px-2.5 text-[13px] leading-normal text-gray-400">
        <span>Stale after {staleDays} days without contact</span>
        <Link href="/settings" aria-current={pathname === '/settings' ? 'page' : undefined} className={`w-fit font-semibold hover:text-white ${pathname === '/settings' ? 'text-white' : 'text-gray-300'}`}>
          Settings
        </Link>
        <span className="truncate" title={email}>{email}</span>
        <button onClick={signOut} className="w-fit cursor-pointer text-left text-gray-300 hover:text-white">
          Sign out
        </button>
      </div>
    </aside>
  )
}
