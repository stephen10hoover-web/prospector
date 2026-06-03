'use client'

import { useState } from 'react'
import { Radio, Eye, Send, Loader2, Check, X } from 'lucide-react'

type Segment = 'all' | 'pro' | 'team' | 'free_trial' | 'active' | 'canceled'

const SEGMENTS: { value: Segment; label: string; description: string }[] = [
  { value: 'all',        label: 'All Users',       description: 'Every registered account' },
  { value: 'active',     label: 'Active Paid',      description: 'Pro + Team with active status' },
  { value: 'pro',        label: 'Pro Only',         description: 'Active Pro subscribers' },
  { value: 'team',       label: 'Team Only',        description: 'Active Team subscribers' },
  { value: 'free_trial', label: 'Free Trial',       description: 'Trial accounts (not yet converted)' },
  { value: 'canceled',   label: 'Canceled',         description: 'Previously paying, now canceled' },
]

type Phase = 'compose' | 'preview' | 'sending' | 'done'

interface PreviewResult {
  recipient_count: number
  sample: string[]
}

interface SendResult {
  sent: number
  failed: number
  total: number
}

export default function AdminBroadcastPage() {
  const [target, setTarget] = useState<Segment>('all')
  const [subject, setSubject] = useState('')
  const [html, setHtml] = useState('')
  const [phase, setPhase] = useState<Phase>('compose')
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [confirmation, setConfirmation] = useState('')
  const [sendResult, setSendResult] = useState<SendResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const selectedSegment = SEGMENTS.find((s) => s.value === target)!
  const requiredPhrase = `SEND TO ${preview?.recipient_count ?? '?'} USERS`

  async function handlePreview() {
    if (!subject.trim() || !html.trim()) {
      setError('Subject and message body are required')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/internal/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, html, target, preview: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Preview failed')
      setPreview(data)
      setPhase('preview')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSend() {
    if (confirmation !== requiredPhrase) return
    setPhase('sending')
    setLoading(true)
    try {
      const res = await fetch('/api/internal/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, html, target, confirmation: 'SEND BROADCAST' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Send failed')
      setSendResult(data)
      setPhase('done')
    } catch (e) {
      setError((e as Error).message)
      setPhase('preview')
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setSubject('')
    setHtml('')
    setTarget('all')
    setPhase('compose')
    setPreview(null)
    setConfirmation('')
    setSendResult(null)
    setError(null)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Broadcast</h1>
        <p className="text-sm text-white/40 mt-0.5">
          Send emails to user segments. Two-phase: preview then send.
        </p>
      </div>

      {phase === 'done' && sendResult ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-green-500/20 rounded-full p-4">
              <Check className="h-8 w-8 text-green-400" />
            </div>
          </div>
          <div>
            <p className="text-xl font-bold text-white">Broadcast Sent</p>
            <p className="text-white/50 mt-1">
              {sendResult.sent.toLocaleString()} delivered · {sendResult.failed} failed
            </p>
          </div>
          <button
            onClick={reset}
            className="px-4 py-2 rounded-lg bg-white/10 text-white/70 hover:bg-white/15 text-sm transition-colors"
          >
            Send Another Broadcast
          </button>
        </div>
      ) : phase === 'sending' ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-white/40 mx-auto" />
          <p className="text-white/60">Sending to {preview?.recipient_count?.toLocaleString()} recipients...</p>
          <p className="text-xs text-white/30">This may take a moment for large audiences</p>
        </div>
      ) : phase === 'preview' && preview ? (
        <div className="space-y-4">
          {/* Preview summary */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="h-4 w-4 text-white/40" />
              <h2 className="text-sm font-semibold text-white/70 uppercase tracking-widest">Audience Preview</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Segment</span>
                <span className="text-white/80">{selectedSegment.label}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Recipients</span>
                <span className="text-white font-bold tabular-nums">{preview.recipient_count.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Subject</span>
                <span className="text-white/80 max-w-xs truncate">{subject}</span>
              </div>
              {preview.sample.length > 0 && (
                <div>
                  <p className="text-xs text-white/30 mb-1.5">Sample recipients:</p>
                  <div className="space-y-1">
                    {preview.sample.map((email) => (
                      <p key={email} className="text-xs font-mono text-white/50">{email}</p>
                    ))}
                    {preview.recipient_count > preview.sample.length && (
                      <p className="text-xs text-white/20">+{(preview.recipient_count - preview.sample.length).toLocaleString()} more</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Confirmation */}
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-5 space-y-3">
            <p className="text-sm text-yellow-300 font-medium">
              You are about to send an email to {preview.recipient_count.toLocaleString()} users. This cannot be undone.
            </p>
            <div>
              <label className="text-xs text-white/50 block mb-1">
                Type <span className="font-mono text-white/80">{requiredPhrase}</span> to confirm
              </label>
              <input
                type="text"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30"
                placeholder={requiredPhrase}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSend}
                disabled={confirmation !== requiredPhrase || loading}
                className="flex-1 py-2 rounded-lg text-sm bg-red-700 hover:bg-red-600 text-white transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <Send className="h-3.5 w-3.5" />
                Send Broadcast
              </button>
              <button
                onClick={() => { setPhase('compose'); setConfirmation('') }}
                className="px-4 py-2 rounded-lg text-sm bg-white/5 text-white/60 hover:bg-white/10 transition-colors"
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Compose phase */
        <div className="space-y-4">
          {/* Audience */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Radio className="h-4 w-4 text-white/40" />
              <h2 className="text-sm font-semibold text-white/70 uppercase tracking-widest">Audience</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SEGMENTS.map((seg) => (
                <button
                  key={seg.value}
                  onClick={() => setTarget(seg.value)}
                  className={`text-left p-3 rounded-lg border text-sm transition-colors ${
                    target === seg.value
                      ? 'border-white/30 bg-white/10 text-white'
                      : 'border-white/5 bg-white/3 text-white/50 hover:text-white/70 hover:bg-white/5'
                  }`}
                >
                  <p className="font-medium">{seg.label}</p>
                  <p className="text-xs text-white/30 mt-0.5">{seg.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Compose */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
            <div>
              <label className="text-xs text-white/50 block mb-1.5">Subject</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30"
                placeholder="e.g. New features in Prospector this month"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 block mb-1.5">
                Email HTML
                <span className="text-white/20 ml-2 font-normal">Paste your HTML or plain text</span>
              </label>
              <textarea
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                rows={12}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30 resize-none font-mono"
                placeholder="<p>Hi,</p><p>We're excited to announce...</p>"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
              <X className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={handlePreview}
            disabled={loading || !subject.trim() || !html.trim()}
            className="w-full py-2.5 rounded-lg text-sm bg-white/10 text-white hover:bg-white/15 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
            Preview Audience
          </button>
        </div>
      )}
    </div>
  )
}
