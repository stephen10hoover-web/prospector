'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Circle, ChevronDown, ChevronUp, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface OnboardingStep {
  id: string
  label: string
  description: string
  href: string
}

const STEPS: OnboardingStep[] = [
  {
    id: 'first_search',
    label: 'Run your first lead search',
    description: 'Find local businesses that need a website upgrade.',
    href: '/search',
  },
  {
    id: 'view_leads',
    label: 'Review your leads',
    description: 'Score and filter your prospects by quality.',
    href: '/leads',
  },
  {
    id: 'create_sequence',
    label: 'Create an outreach sequence',
    description: 'Set up automated follow-up emails.',
    href: '/sequences/new',
  },
  {
    id: 'send_email',
    label: 'Send your first outreach email',
    description: 'Enroll a lead and kick off your outreach.',
    href: '/leads',
  },
  {
    id: 'setup_profile',
    label: 'Complete your profile',
    description: 'Add your name and booking link for better replies.',
    href: '/settings',
  },
]

export function OnboardingChecklist() {
  const router = useRouter()
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    fetch('/api/onboarding')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          setCompletedSteps(data.completedSteps ?? [])
          setDismissed(data.dismissed)
        }
      })
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [])

  async function handleDismiss() {
    setDismissed(true)
    await fetch('/api/onboarding', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dismiss: true }),
    }).catch(() => null)
  }

  function handleStepClick(step: OnboardingStep) {
    router.push(step.href)
  }

  if (loading || dismissed) return null

  const completedCount = completedSteps.length
  const totalCount = STEPS.length
  const allDone = completedCount >= totalCount
  const progress = Math.round((completedCount / totalCount) * 100)

  return (
    <div className="mb-6 border rounded-xl bg-card shadow-sm overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
        onClick={() => setCollapsed((p) => !p)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex flex-col gap-1 min-w-0">
            <p className="text-sm font-semibold leading-none">
              {allDone ? 'Setup complete!' : 'Get started with Prospector'}
            </p>
            <p className="text-xs text-muted-foreground">
              {completedCount} of {totalCount} steps completed
            </p>
          </div>
          {/* Progress bar */}
          <div className="hidden sm:block w-24 h-1.5 bg-muted rounded-full overflow-hidden ml-2">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                allDone ? 'bg-green-500' : 'bg-primary'
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {collapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
          <button
            className="ml-1 p-1 rounded hover:bg-muted transition-colors"
            onClick={(e) => { e.stopPropagation(); handleDismiss() }}
            aria-label="Dismiss checklist"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="border-t divide-y">
          {STEPS.map((step) => {
            const done = completedSteps.includes(step.id)
            return (
              <button
                key={step.id}
                onClick={() => handleStepClick(step)}
                className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
              >
                {done ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className={cn('text-sm font-medium', done && 'line-through text-muted-foreground')}>
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
