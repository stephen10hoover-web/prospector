'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { DangerZone } from '@/components/ui/DangerZone'
import { Loader2, Download, Trash2, Shield } from 'lucide-react'

export default function AccountSettingsPage() {
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function exportData() {
    setExporting(true)
    try {
      const res = await fetch('/api/account/export')
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `prospector-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Failed to export data')
    } finally {
      setExporting(false)
    }
  }

  async function deleteAccount() {
    const confirmed = window.confirm(
      'Are you sure you want to permanently delete your account? This cannot be undone. All your leads, outreach history, and settings will be deleted.'
    )
    if (!confirmed) return
    setDeleting(true)
    try {
      const res = await fetch('/api/account', { method: 'DELETE' })
      if (!res.ok) throw new Error('Deletion failed')
      window.location.href = '/'
    } catch {
      toast.error('Failed to delete account. Please contact support.')
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Data &amp; Privacy
          </CardTitle>
          <CardDescription>Export or manage your account data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              Download a copy of all your data including searches, leads, and outreach history.
            </p>
            <Button variant="outline" onClick={exportData} disabled={exporting} className="w-fit">
              {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Export My Data
            </Button>
          </div>

          <Separator />

          <DangerZone>
            <p className="text-sm text-muted-foreground mb-3">
              Permanently delete your account and all associated data. This cannot be undone. Your Stripe subscription will be canceled automatically.
            </p>
            <Button variant="destructive" onClick={deleteAccount} disabled={deleting} className="w-fit">
              {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete My Account
            </Button>
          </DangerZone>
        </CardContent>
      </Card>
    </div>
  )
}
