'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import type { Business, OutreachEmail } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Loader2, Mail, RefreshCw, Send, Sparkles } from 'lucide-react'

interface OutreachModalProps {
  business: Business
  defaultOpen?: boolean
  onClose?: () => void
}

export function OutreachModal({ business, defaultOpen = false, onClose }: OutreachModalProps) {
  const [open, setOpen] = useState(defaultOpen)
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState(false)
  const [email, setEmail] = useState<OutreachEmail | null>(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [toEmail, setToEmail] = useState(business.email ?? '')

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen)
    if (!newOpen && onClose) {
      onClose()
    }
  }

  async function handleGenerate() {
    setGenerating(true)
    try {
      const res = await fetch(`/api/leads/${business.id}/outreach`, {
        method: 'POST',
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to generate')
      }
      const data: OutreachEmail = await res.json()
      setEmail(data)
      setSubject(data.subject)
      setBody(data.body)
      toast.success('Email generated!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  async function handleSend() {
    if (!toEmail) {
      toast.error('Please enter a recipient email address')
      return
    }
    if (!subject || !body) {
      toast.error('Please generate or write an email first')
      return
    }

    setSending(true)
    try {
      const res = await fetch(`/api/leads/${business.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: toEmail, subject, body }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to send')
      }
      toast.success('Email sent successfully!')
      handleOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Send failed')
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!defaultOpen && (
        <DialogTrigger asChild>
          <Button>
            <Mail className="h-4 w-4 mr-2" />
            Generate Outreach
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            AI Outreach for {business.name}
          </DialogTitle>
          <DialogDescription>
            Generate a personalized cold email and send it directly from here.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline">{business.category}</Badge>
            <Badge variant="outline">{business.city}, {business.state}</Badge>
            <Badge variant={business.lead_score >= 70 ? 'default' : 'secondary'}>
              Score: {business.lead_score}/100
            </Badge>
          </div>

          {!email && (
            <div className="text-center py-8 border rounded-lg bg-muted/20">
              <Sparkles className="h-10 w-10 mx-auto mb-3 text-primary opacity-70" />
              <p className="text-sm text-muted-foreground mb-4">
                Click below to generate a personalized outreach email using AI.
                <br />
                Claude will analyze this business and craft a compelling pitch.
              </p>
              <Button onClick={handleGenerate} disabled={generating} size="lg">
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Email
                  </>
                )}
              </Button>
            </div>
          )}

          {email && (
            <>
              {email.talkingPoints && email.talkingPoints.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-blue-700 mb-2">AI Talking Points:</p>
                  <ul className="space-y-1">
                    {email.talkingPoints.map((point, i) => (
                      <li key={i} className="text-xs text-blue-600 flex items-start gap-1.5">
                        <span className="text-blue-400 mt-0.5">•</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Separator />

              <div className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="to-email">To:</Label>
                  <Input
                    id="to-email"
                    type="email"
                    placeholder="recipient@business.com"
                    value={toEmail}
                    onChange={(e) => setToEmail(e.target.value)}
                    disabled={sending}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="subject">Subject:</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    disabled={sending}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="body">Email Body:</Label>
                  <Textarea
                    id="body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    disabled={sending}
                    rows={12}
                    className="font-mono text-sm leading-relaxed resize-y"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  onClick={handleGenerate}
                  disabled={generating || sending}
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Regenerate
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleSend}
                  disabled={sending || generating || !toEmail}
                >
                  {sending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Now
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
