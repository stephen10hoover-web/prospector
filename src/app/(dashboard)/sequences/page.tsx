import { createAdminClient } from '@/lib/supabase-server'
import { createServerClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Zap, Users, CheckCircle, Clock } from 'lucide-react'
import { DeleteSequenceButton } from '@/components/sequences/DeleteSequenceButton'

export default async function SequencesPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const admin = createAdminClient()

  const [{ data: sequences }, { data: enrollments }] = await Promise.all([
    admin
      .from('sequences')
      .select('*, sequence_steps(id, step_number, delay_days, subject)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false }),
    admin
      .from('sequence_enrollments')
      .select('sequence_id, status')
      .eq('user_id', session.user.id),
  ])

  const countMap: Record<string, { active: number; completed: number; replied: number }> = {}
  for (const e of enrollments ?? []) {
    const sid = e.sequence_id as string
    if (!countMap[sid]) countMap[sid] = { active: 0, completed: 0, replied: 0 }
    if (e.status === 'active') countMap[sid].active++
    if (e.status === 'completed') countMap[sid].completed++
    if (e.status === 'replied') countMap[sid].replied++
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sequences</h1>
          <p className="text-muted-foreground mt-1">
            Automated follow-up campaigns that run while you sleep
          </p>
        </div>
        <Button asChild>
          <Link href="/sequences/new">
            <Plus className="h-4 w-4 mr-2" />
            New Sequence
          </Link>
        </Button>
      </div>

      {(!sequences || sequences.length === 0) ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="bg-primary/5 rounded-full p-4 w-fit mx-auto mb-4">
              <Zap className="h-10 w-10 text-primary opacity-60" />
            </div>
            <p className="text-base font-medium mb-1">No sequences yet</p>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Build a multi-step follow-up sequence once and enroll any lead. Replies auto-stop the sequence.
            </p>
            <Button asChild>
              <Link href="/sequences/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Sequence
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sequences.map((seq) => {
            const steps = (seq.sequence_steps ?? []) as { step_number: number; delay_days: number; subject: string }[]
            const counts = countMap[seq.id] ?? { active: 0, completed: 0, replied: 0 }
            const totalDays = steps.reduce((sum, s) => sum + s.delay_days, 0)

            return (
              <Card key={seq.id} className="hover:shadow-sm transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg">{seq.name}</CardTitle>
                      {seq.description && (
                        <p className="text-sm text-muted-foreground mt-0.5">{seq.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <DeleteSequenceButton sequenceId={seq.id} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-6 text-sm mb-4">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Zap className="h-3.5 w-3.5" />
                      <span>{steps.length} step{steps.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{totalDays} day{totalDays !== 1 ? 's' : ''} total</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-blue-600">
                      <Users className="h-3.5 w-3.5" />
                      <span>{counts.active} active</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-green-600">
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>{counts.replied} replied</span>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {steps.sort((a, b) => a.step_number - b.step_number).map((step, i) => (
                      <div key={step.step_number} className="flex items-center gap-1">
                        <div className="bg-muted rounded-md px-2 py-1 text-xs">
                          <span className="text-muted-foreground">Step {i + 1}</span>
                          <span className="mx-1 text-muted-foreground">·</span>
                          <span className="font-medium">Day {step.delay_days}</span>
                        </div>
                        {i < steps.length - 1 && (
                          <span className="text-muted-foreground text-xs">→</span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Card className="border-dashed">
        <CardContent className="py-4 px-5">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Variables you can use in templates:</span>{' '}
            <Badge variant="secondary" className="text-xs font-mono">{'{{name}}'}</Badge>{' '}
            <Badge variant="secondary" className="text-xs font-mono">{'{{city}}'}</Badge>{' '}
            <Badge variant="secondary" className="text-xs font-mono">{'{{state}}'}</Badge>{' '}
            <Badge variant="secondary" className="text-xs font-mono">{'{{category}}'}</Badge>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
