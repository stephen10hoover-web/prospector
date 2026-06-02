'use client'

import { X } from 'lucide-react'

type BannerVariant = 'amber' | 'orange' | 'blue' | 'red' | 'muted'

const VARIANT_CLASSES: Record<BannerVariant, string> = {
  amber:  'bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100',
  orange: 'bg-orange-50 dark:bg-orange-950/30 border-b border-orange-300 dark:border-orange-700 text-orange-900 dark:text-orange-100',
  blue:   'bg-blue-50 dark:bg-blue-950/30 border-b border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100',
  red:    'bg-red-50 dark:bg-red-950/30 border-b border-red-300 dark:border-red-800 text-red-900 dark:text-red-100',
  muted:  'bg-muted/50 border-b border-border text-muted-foreground',
}

interface BannerShellProps {
  variant: BannerVariant
  dismissible?: boolean
  onDismiss?: () => void
  children: React.ReactNode
}

export function BannerShell({ variant, dismissible, onDismiss, children }: BannerShellProps) {
  return (
    <div className={`w-full px-6 py-3 flex items-center gap-3 ${VARIANT_CLASSES[variant]}`}>
      <div className="flex-1 min-w-0">{children}</div>
      {dismissible && onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
