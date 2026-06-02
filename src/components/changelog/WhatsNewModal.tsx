'use client'

import { useEffect, useState } from 'react'
import { X, Sparkles, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ChangelogEntry {
  id: string
  date: string
  title: string
  items: string[]
}

export function WhatsNewModal() {
  const [open, setOpen] = useState(false)
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([])
  const [hasNew, setHasNew] = useState(false)

  useEffect(() => {
    fetch('/api/changelog')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          setChangelog(data.changelog)
          setHasNew(data.hasNew)
          if (data.hasNew) setOpen(true)
        }
      })
      .catch(() => null)
  }, [])

  async function handleClose() {
    setOpen(false)
    setHasNew(false)
    await fetch('/api/changelog', { method: 'POST' }).catch(() => null)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-black/50" aria-hidden />
      <div
        role="dialog"
        aria-label="What's new"
        aria-modal="true"
        className="relative w-full max-w-md bg-card rounded-xl border shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">What&apos;s New</h2>
            {hasNew && (
              <span className="bg-primary text-primary-foreground text-xs font-bold rounded-full px-1.5 py-0.5 leading-none">
                NEW
              </span>
            )}
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-5 py-4 space-y-5">
          {changelog.map((entry, i) => (
            <div key={entry.id}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-sm font-semibold">{entry.title}</p>
                <span className="text-xs text-muted-foreground">{entry.date}</span>
              </div>
              <ul className="space-y-1">
                {entry.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              {i < changelog.length - 1 && <div className="mt-4 border-t" />}
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t flex justify-end">
          <Button size="sm" onClick={handleClose}>Got it</Button>
        </div>
      </div>
    </div>
  )
}
