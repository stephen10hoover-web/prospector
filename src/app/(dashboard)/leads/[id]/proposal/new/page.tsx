'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Trash2, ArrowLeft, FileText, Star } from 'lucide-react'
import Link from 'next/link'
import type { ProposalService, ProposalPackage } from '@/types'

const BILLING_LABELS = {
  one_time: 'One-time',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
}

export default function NewProposalPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const businessId = params.id

  const [title, setTitle] = useState('Website Redesign Proposal')
  const [intro, setIntro] = useState(
    `Thank you for the opportunity to present this proposal. After reviewing your current online presence, we've identified several key improvements that will help you attract more customers and grow your business.`
  )
  const [about, setAbout] = useState('')
  const [nextSteps, setNextSteps] = useState(
    `To move forward, simply reply to this email or give us a call. We'll schedule a brief discovery call to finalize details and get started.`
  )
  const [services, setServices] = useState<ProposalService[]>([
    { name: 'Website Design & Development', description: 'Modern, mobile-responsive website', included: true },
    { name: 'SEO Optimization', description: 'Basic on-page SEO setup', included: true },
    { name: 'Google Business Profile Setup', description: 'Optimize your Google listing', included: true },
  ])
  const [packages, setPackages] = useState<ProposalPackage[]>([
    {
      name: 'Starter',
      price: 1500,
      billing: 'one_time',
      features: ['5-page website', 'Mobile responsive', 'Contact form', '1 round of revisions'],
      recommended: false,
    },
    {
      name: 'Professional',
      price: 2500,
      billing: 'one_time',
      features: ['10-page website', 'SEO optimized', 'Google Business setup', '3 rounds of revisions', '30-day support'],
      recommended: true,
    },
  ])
  const [saving, setSaving] = useState(false)

  function addService() {
    setServices([...services, { name: '', description: '', included: true }])
  }

  function removeService(i: number) {
    setServices(services.filter((_, idx) => idx !== i))
  }

  function updateService(i: number, field: keyof ProposalService, value: string | boolean) {
    setServices(services.map((s, idx) => idx === i ? { ...s, [field]: value } : s))
  }

  function addPackage() {
    setPackages([...packages, { name: '', price: 0, billing: 'one_time', features: [], recommended: false }])
  }

  function removePackage(i: number) {
    setPackages(packages.filter((_, idx) => idx !== i))
  }

  function updatePackage(i: number, field: keyof ProposalPackage, value: unknown) {
    setPackages(packages.map((p, idx) => idx === i ? { ...p, [field]: value } : p))
  }

  function addFeature(pkgIdx: number) {
    updatePackage(pkgIdx, 'features', [...packages[pkgIdx].features, ''])
  }

  function updateFeature(pkgIdx: number, featIdx: number, val: string) {
    const newFeatures = [...packages[pkgIdx].features]
    newFeatures[featIdx] = val
    updatePackage(pkgIdx, 'features', newFeatures)
  }

  function removeFeature(pkgIdx: number, featIdx: number) {
    updatePackage(pkgIdx, 'features', packages[pkgIdx].features.filter((_, i) => i !== featIdx))
  }

  async function handleSave() {
    if (!title.trim()) { toast.error('Proposal title is required'); return }

    setSaving(true)
    try {
      const res = await fetch(`/api/leads/${businessId}/proposals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: {
            intro,
            services: services.filter((s) => s.name.trim()),
            packages: packages.filter((p) => p.name.trim()),
            about,
            next_steps: nextSteps,
          },
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to create proposal')
      }

      const proposal = await res.json()
      toast.success('Proposal created!')
      router.push(`/leads/${businessId}/proposal`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create proposal')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/leads/${businessId}`}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Lead
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Proposal</h1>
          <p className="text-sm text-muted-foreground">Build a shareable proposal for this lead</p>
        </div>
      </div>

      {/* Title */}
      <Card>
        <CardHeader><CardTitle className="text-base">Proposal Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Proposal Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" placeholder="e.g. Website Redesign Proposal" />
          </div>
          <div>
            <Label>Introduction</Label>
            <Textarea value={intro} onChange={(e) => setIntro(e.target.value)} className="mt-1 min-h-[100px]" placeholder="Opening message to the prospect..." />
          </div>
        </CardContent>
      </Card>

      {/* Services */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Services Included</CardTitle>
            <Button size="sm" variant="outline" onClick={addService}>
              <Plus className="h-3.5 w-3.5 mr-1" />Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {services.map((svc, i) => (
            <div key={i} className="flex items-start gap-2">
              <button
                onClick={() => updateService(i, 'included', !svc.included)}
                className={`mt-2.5 h-4 w-4 rounded border-2 shrink-0 flex items-center justify-center ${svc.included ? 'bg-primary border-primary' : 'border-gray-300'}`}
              >
                {svc.included && <span className="text-primary-foreground text-xs">✓</span>}
              </button>
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Input
                  value={svc.name}
                  onChange={(e) => updateService(i, 'name', e.target.value)}
                  placeholder="Service name"
                  className="h-8 text-sm"
                />
                <Input
                  value={svc.description}
                  onChange={(e) => updateService(i, 'description', e.target.value)}
                  placeholder="Brief description"
                  className="h-8 text-sm"
                />
              </div>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => removeService(i)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          {services.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No services yet. Add one above.</p>
          )}
        </CardContent>
      </Card>

      {/* Packages */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Pricing Packages</CardTitle>
            <Button size="sm" variant="outline" onClick={addPackage} disabled={packages.length >= 5}>
              <Plus className="h-3.5 w-3.5 mr-1" />Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {packages.map((pkg, pi) => (
            <div key={pi} className={`border rounded-lg p-4 space-y-3 ${pkg.recommended ? 'border-primary' : ''}`}>
              <div className="flex items-center gap-2">
                <Input
                  value={pkg.name}
                  onChange={(e) => updatePackage(pi, 'name', e.target.value)}
                  placeholder="Package name"
                  className="h-8 text-sm flex-1"
                />
                <Input
                  type="number"
                  value={pkg.price}
                  onChange={(e) => updatePackage(pi, 'price', parseFloat(e.target.value) || 0)}
                  placeholder="Price"
                  className="h-8 text-sm w-28"
                  min={0}
                />
                <select
                  value={pkg.billing}
                  onChange={(e) => updatePackage(pi, 'billing', e.target.value)}
                  className="h-8 text-sm border rounded px-2 bg-background"
                >
                  {Object.entries(BILLING_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                <button
                  onClick={() => updatePackage(pi, 'recommended', !pkg.recommended)}
                  className={`h-7 px-2 rounded text-xs flex items-center gap-1 border ${pkg.recommended ? 'bg-primary text-primary-foreground border-primary' : 'text-muted-foreground'}`}
                  title="Mark as recommended"
                >
                  <Star className="h-3 w-3" />
                </button>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => removePackage(pi)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="space-y-1.5">
                {pkg.features.map((feat, fi) => (
                  <div key={fi} className="flex items-center gap-2">
                    <Input
                      value={feat}
                      onChange={(e) => updateFeature(pi, fi, e.target.value)}
                      placeholder="Feature description"
                      className="h-7 text-xs"
                    />
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removeFeature(pi, fi)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button size="sm" variant="ghost" className="h-6 text-xs text-muted-foreground" onClick={() => addFeature(pi)}>
                  <Plus className="h-3 w-3 mr-1" />Add feature
                </Button>
              </div>
            </div>
          ))}
          {packages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No packages yet. Add one above.</p>
          )}
        </CardContent>
      </Card>

      {/* About + Next Steps */}
      <Card>
        <CardHeader><CardTitle className="text-base">About &amp; Next Steps</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>About Your Business <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Textarea value={about} onChange={(e) => setAbout(e.target.value)} className="mt-1 min-h-[80px]" placeholder="Brief bio about you/your agency..." />
          </div>
          <div>
            <Label>Next Steps</Label>
            <Textarea value={nextSteps} onChange={(e) => setNextSteps(e.target.value)} className="mt-1 min-h-[80px]" placeholder="How should they move forward?" />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3 pb-8">
        <Button variant="outline" asChild>
          <Link href={`/leads/${businessId}`}>Cancel</Link>
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
          {saving ? 'Saving...' : 'Create Proposal'}
        </Button>
      </div>
    </div>
  )
}
