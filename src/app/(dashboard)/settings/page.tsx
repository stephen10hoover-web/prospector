'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, User, Link2 } from 'lucide-react'

interface SenderProfile {
  full_name: string
  company_name: string
  mailing_address: string
  booking_link: string
}

export default function SettingsProfilePage() {
  const [profile, setProfile] = useState<SenderProfile>({
    full_name: '',
    company_name: '',
    mailing_address: '',
    booking_link: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.ok ? r.json() : null)
      .then((json) => {
        if (json) {
          setProfile({
            full_name: json.full_name ?? '',
            company_name: json.company_name ?? '',
            mailing_address: json.mailing_address ?? '',
            booking_link: json.booking_link ?? '',
          })
        }
      })
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [])

  async function saveProfile() {
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast.success('Profile saved')
    } catch {
      toast.error('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Sender Profile
          </CardTitle>
          <CardDescription>
            Your name and address appear in the footer of every outreach email, as required by CAN-SPAM law.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="full_name">Your Name</Label>
            <Input
              id="full_name"
              placeholder="Jane Smith"
              value={profile.full_name}
              onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="company_name">Company Name</Label>
            <Input
              id="company_name"
              placeholder="Acme LLC"
              value={profile.company_name}
              onChange={(e) => setProfile((p) => ({ ...p, company_name: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="mailing_address">Mailing Address</Label>
            <Input
              id="mailing_address"
              placeholder="123 Main St · Austin, TX 78701"
              value={profile.mailing_address}
              onChange={(e) => setProfile((p) => ({ ...p, mailing_address: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="booking_link" className="flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5" />
              Booking Link
              <span className="text-xs text-muted-foreground font-normal ml-1">(optional — appended to sequence emails)</span>
            </Label>
            <Input
              id="booking_link"
              placeholder="https://calendly.com/yourname"
              value={profile.booking_link}
              onChange={(e) => setProfile((p) => ({ ...p, booking_link: e.target.value }))}
            />
          </div>
          <Button onClick={saveProfile} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Profile
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
