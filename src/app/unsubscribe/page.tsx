'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function UnsubscribePage() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  useEffect(() => {
    if (!email) return
    setStatus('loading')
    fetch('/api/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
      .then((r) => (r.ok ? setStatus('done') : setStatus('error')))
      .catch(() => setStatus('error'))
  }, [email])

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 480, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>Unsubscribe</h1>
      {!email && <p>Invalid unsubscribe link.</p>}
      {status === 'loading' && <p>Processing your request...</p>}
      {status === 'done' && (
        <p style={{ color: '#16a34a' }}>
          <strong>{email}</strong> has been unsubscribed. You will not receive any further emails.
        </p>
      )}
      {status === 'error' && (
        <p style={{ color: '#dc2626' }}>Something went wrong. Please try again or reply to the email with &quot;unsubscribe&quot;.</p>
      )}
    </div>
  )
}
