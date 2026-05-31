'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const CONSENT_KEY = 'cookie_consent'

export function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(CONSENT_KEY)) setVisible(true)
    } catch {
      setVisible(true)
    }
  }, [])

  function respond(accepted: boolean) {
    try { localStorage.setItem(CONSENT_KEY, accepted ? 'accepted' : 'declined') } catch {}
    setVisible(false)
    // If analytics ever initializes conditionally, trigger that here based on `accepted`
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cookie consent"
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        background: '#18181b',
        color: '#f4f4f5',
        borderRadius: 12,
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        maxWidth: 600,
        width: 'calc(100vw - 48px)',
        fontSize: 14,
        flexWrap: 'wrap',
      }}
    >
      <p style={{ margin: 0, flex: 1, minWidth: 200 }}>
        We use essential cookies for authentication and optional analytics cookies to improve the
        platform.{' '}
        <Link href="/privacy" style={{ color: '#a1a1aa', textDecoration: 'underline' }}>
          Privacy Policy
        </Link>
      </p>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          onClick={() => respond(false)}
          style={{
            background: 'transparent',
            color: '#a1a1aa',
            border: '1px solid #3f3f46',
            borderRadius: 8,
            padding: '8px 16px',
            fontWeight: 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            fontSize: 14,
          }}
        >
          Decline
        </button>
        <button
          onClick={() => respond(true)}
          style={{
            background: '#fff',
            color: '#18181b',
            border: 'none',
            borderRadius: 8,
            padding: '8px 18px',
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            fontSize: 14,
          }}
        >
          Accept
        </button>
      </div>
    </div>
  )
}
