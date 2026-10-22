'use client'

// Last-resort boundary for errors in the root layout. Replaces the whole document, so it needs its own <html>.
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#f7f7f7', color: '#09090b', fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>
        <main role="alert" style={{ maxWidth: 520, margin: '15vh auto 0', padding: 24, background: '#fdfdfd', border: '1px solid #e4e4e7', borderRadius: 16 }}>
          <h1 style={{ fontSize: 18, margin: '0 0 8px' }}>Something went wrong</h1>
          <p style={{ fontSize: 15, lineHeight: 1.5, color: '#3f3f46', margin: '0 0 16px' }}>
            The app hit an unexpected error. Your data is safe. Try again, and if it keeps happening let me know.
          </p>
          {error.digest && <p style={{ fontSize: 12, color: '#71717a', margin: '0 0 16px' }}>Reference: {error.digest}</p>}
          <button
            onClick={() => retry()}
            style={{ background: '#ac0a55', color: '#fdfdfd', border: 0, borderRadius: 10, padding: '9px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  )
}
