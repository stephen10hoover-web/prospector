'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem('cookie_consent')) setVisible(true)
    } catch {
      setVisible(true)
    }
  }, [])

  function accept() {
    try { localStorage.setItem('cookie_consent', '1') } catch {}
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
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
        maxWidth: 560,
        width: 'calc(100vw - 48px)',
        fontSize: 14,
      }}
    >
      <p style={{ margin: 0, flex: 1 }}>
        We use cookies for authentication and analytics.{' '}
        <Link href="/privacy" style={{ color: '#a1a1aa', textDecoration: 'underline' }}>
          Privacy Policy
        </Link>
      </p>
      <button
        onClick={accept}
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
        Got it
      </button>
    </div>
  )
}
