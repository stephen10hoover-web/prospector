'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, ArrowLeft, Zap } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface Step {
  step_number: number
  delay_days: number
  subject: string
  body: string
}

const DEFAULT_STEPS: Step[] = [
  {
    step_number: 1,
    delay_days: 3,
    subject: 'Still thinking about {{name}}?',
    body: `Hi there,

Just wanted to follow up on my previous message about {{name}}'s online presence.

I know things get busy — I just wanted to make sure my note didn't get buried.

Would a quick 15-minute call this week make sense? I've helped similar businesses in {{city}} significantly improve their leads from their website.

Let me know either way!`,
  },
  {
    step_number: 2,
    delay_days: 5,
    subject: 'One last thought for {{name}}',
    body: `Hi,

I'll keep this short — I don't want to be a bother.

I genuinely think there's a real opportunity to grow {{name}}'s online presence, and I'd love to show you what that could look like. No commitment, just a conversation.

If now isn't the right time, no worries at all. Feel free to reach out whenever it makes sense.

Best,`,
  },
]

export default function NewSequencePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [steps, setSteps] = useState<Step[]>(DEFAULT_STEPS)
  const [saving, setSaving] = useState(false)

  function addStep() {
    const lastStep = steps[steps.length - 1]
    setSteps([
      ...steps,
      {
        step_number: steps.length + 1,
        delay_days: 4,
        subject: '',
        body: '',
      },
    ])
  }

  function removeStep(index: number) {
    if (steps.length === 1) return
    const updated = steps
      .filter((_, i) => i !== index)
      .map((s, i) => ({ ...s, step_number: i + 1 }))
    setSteps(updated)
  }

  function updateStep(index: number, field: keyof Step, value: string | number) {
    setSteps(steps.map((s, i) => (i === index ? { ...s, [field]: value } : s)))
  }

  async function handleSave() {
    if (!name.trim()) { toast.error('Sequence name is required'); return }
    for (const step of steps) {
      if (!step.subject.trim() || !step.body.trim()) {
        toast.error(`Step ${step.step_number}: subject and body are required`)
        return
      }
    }

    setSaving(true)
    try {
      const res = await fetch('/api/sequences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined, steps }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to save')
      }
      toast.success('Sequence created!')
      router.push('/sequences')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save sequence')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/sequences">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Sequence</h1>
          <p className="text-sm text-muted-foreground">
            Build a multi-step follow-up campaign. Variables: {'{{name}}'}, {'{{city}}'}, {'{{category}}'}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sequence Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 3-Step Website Outreach"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="description">Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this sequence for?"
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {steps.map((step, index) => (
          <Card key={index} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                    {step.step_number}
                  </div>
                  <CardTitle className="text-base">
                    Step {step.step_number}
                    <span className="text-muted-foreground font-normal text-sm ml-2">
                      — sends {step.delay_days} day{step.delay_days !== 1 ? 's' : ''} after previous
                    </span>
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs text-muted-foreground">Delay (days)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={90}
                      value={step.delay_days}
                      onChange={(e) => updateStep(index, 'delay_days', parseInt(e.target.value) || 0)}
                      className="w-16 h-7 text-sm"
                    />
                  </div>
                  {steps.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => removeStep(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Subject Line</Label>
                <Input
                  value={step.subject}
                  onChange={(e) => updateStep(index, 'subject', e.target.value)}
                  placeholder="Subject line..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Email Body</Label>
                <Textarea
                  value={step.body}
                  onChange={(e) => updateStep(index, 'body', e.target.value)}
                  placeholder="Write your follow-up email..."
                  className="mt-1 min-h-[160px] font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {steps.length < 10 && (
        <Button variant="outline" onClick={addStep} className="w-full border-dashed">
          <Plus className="h-4 w-4 mr-2" />
          Add Step
        </Button>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button variant="outline" asChild>
          <Link href="/sequences">Cancel</Link>
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Zap className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Sequence'}
        </Button>
      </div>
    </div>
  )
}
