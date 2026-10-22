'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/Button'
import { createClient } from '@/lib/supabase'

const inputClass =
  'w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-magenta'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setNotice('')
    setLoading(true)
    const supabase = createClient()

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setNotice('Check your email for a confirmation link.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else {
        router.push('/dashboard')
        router.refresh()
      }
    }
    setLoading(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 font-sans">
      <div className="w-full max-w-sm rounded-xl border border-border bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-baseline gap-2">
          <span className="text-[22px] font-extrabold tracking-[-0.04em]">Zoodealio</span>
          <span className="text-xs font-bold text-magenta-bright">CRM</span>
        </div>
        <h1 className="mb-1 text-2xl font-bold tracking-[-0.03em]">
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h1>
        <p className="mb-6 text-sm text-gray-500">
          {mode === 'login' ? 'Sign in to your pipeline.' : 'Use your email to get started.'}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-gray-700">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className={inputClass}
              placeholder="you@example.com"
            />
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-gray-700">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className={inputClass}
              placeholder="••••••••"
            />
          </label>

          {error && <p role="alert" className="text-sm text-magenta-bright">{error}</p>}
          {notice && <p role="status" className="text-sm text-green-deep">{notice}</p>}

          <Button type="submit" size="sm" disabled={loading}>
            {loading ? 'Loading…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login')
              setError('')
              setNotice('')
            }}
            className="cursor-pointer font-bold text-magenta hover:text-magenta-dark"
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </main>
  )
}
