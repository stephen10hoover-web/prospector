'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Zap, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface Sequence {
  id: string
  name: string
  description: string | null
  sequence_steps: { step_number: number; delay_days: number }[]
  active_enrollments: number
}

interface EnrollModalProps {
  businessId: string
  businessName: string
}

export function EnrollModal({ businessId, businessName }: EnrollModalProps) {
  const [open, setOpen] = useState(false)
  const [sequences, setSequences] = useState<Sequence[]>([])
  const [loading, setLoading] = useState(false)
  const [enrolling, setEnrolling] = useState<string | null>(null)
  const [enrolled, setEnrolled] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch('/api/sequences')
      .then((r) => r.json())
      .then((data) => setSequences(Array.isArray(data) ? data : []))
      .catch(() => toast.error('Failed to load sequences'))
      .finally(() => setLoading(false))
  }, [open])

  async function handleEnroll(sequenceId: string) {
    setEnrolling(sequenceId)
    try {
      const res = await fetch('/api/sequences/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sequenceId, businessId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to enroll')
      setEnrolled(sequenceId)
      toast.success(`${businessName} enrolled in sequence`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to enroll')
    } finally {
      setEnrolling(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Zap className="h-4 w-4 mr-2" />
          Enroll in Sequence
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enroll in Follow-Up Sequence</DialogTitle>
          <DialogDescription>
            Pick a sequence for <strong>{businessName}</strong>. The first email sends automatically after the configured delay. Sequence stops if they reply.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading sequences...</div>
        )}

        {!loading && sequences.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground mb-3">No sequences yet</p>
            <Button variant="outline" size="sm" asChild>
              <a href="/sequences/new" target="_blank" rel="noopener noreferrer">
                Create a Sequence
              </a>
            </Button>
          </div>
        )}

        {!loading && sequences.length > 0 && (
          <div className="space-y-2">
            {sequences.map((seq) => {
              const isEnrolled = enrolled === seq.id
              const isEnrolling = enrolling === seq.id
              const totalDays = seq.sequence_steps.reduce((s, x) => s + x.delay_days, 0)

              return (
                <div
                  key={seq.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{seq.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {seq.sequence_steps.length} steps · {totalDays} days total
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={isEnrolled ? 'secondary' : 'default'}
                    disabled={isEnrolling || isEnrolled}
                    onClick={() => handleEnroll(seq.id)}
                    className="ml-3 shrink-0"
                  >
                    {isEnrolled ? (
                      <>
                        <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                        Enrolled
                      </>
                    ) : isEnrolling ? (
                      'Enrolling...'
                    ) : (
                      'Enroll'
                    )}
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
