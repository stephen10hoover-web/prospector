'use client'

import { useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, Upload, FileText, AlertTriangle, CheckCircle, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

type ColumnKey = 'name' | 'category' | 'address' | 'city' | 'state' | 'phone' | 'email' | 'website_url' | 'skip'

const COLUMN_OPTIONS: { value: ColumnKey; label: string; required?: boolean }[] = [
  { value: 'name', label: 'Business Name', required: true },
  { value: 'category', label: 'Category', required: true },
  { value: 'address', label: 'Address' },
  { value: 'city', label: 'City' },
  { value: 'state', label: 'State' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'website_url', label: 'Website URL' },
  { value: 'skip', label: '— Skip column —' },
]

function parseCsv(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  return lines.map((line) => {
    const cols: string[] = []
    let cur = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) {
        cols.push(cur.trim())
        cur = ''
      } else {
        cur += ch
      }
    }
    cols.push(cur.trim())
    return cols
  })
}

function guessMapping(header: string): ColumnKey {
  const h = header.toLowerCase().replace(/[^a-z]/g, '')
  if (['name', 'business', 'company', 'businessname', 'companyname'].includes(h)) return 'name'
  if (['category', 'type', 'industry', 'businesstype'].includes(h)) return 'category'
  if (['address', 'streetaddress', 'street'].includes(h)) return 'address'
  if (['city', 'town'].includes(h)) return 'city'
  if (['state', 'province', 'region'].includes(h)) return 'state'
  if (['phone', 'tel', 'telephone', 'mobile', 'phonenumber'].includes(h)) return 'phone'
  if (['email', 'emailaddress', 'mail'].includes(h)) return 'email'
  if (['website', 'url', 'websiteurl', 'web', 'site'].includes(h)) return 'website_url'
  return 'skip'
}

export function ImportButton() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'upload' | 'map' | 'importing' | 'done'>('upload')
  const [headers, setHeaders] = useState<string[]>([])
  const [previewRows, setPreviewRows] = useState<string[][]>([])
  const [allRows, setAllRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<ColumnKey[]>([])
  const [filename, setFilename] = useState('')
  const [result, setResult] = useState<{ imported: number; skipped: number; total: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function handleReset() {
    setStep('upload')
    setHeaders([])
    setPreviewRows([])
    setAllRows([])
    setMapping([])
    setFilename('')
    setResult(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      toast.error('Please upload a CSV file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large (max 5MB)')
      return
    }
    setFilename(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const rows = parseCsv(text)
      if (rows.length < 2) {
        toast.error('CSV must have a header row and at least one data row')
        return
      }
      const [headerRow, ...dataRows] = rows
      setHeaders(headerRow)
      setAllRows(dataRows)
      setPreviewRows(dataRows.slice(0, 3))
      setMapping(headerRow.map(guessMapping))
      setStep('map')
    }
    reader.readAsText(file)
  }

  async function handleImport() {
    // Validate required columns are mapped
    const nameIdx = mapping.indexOf('name')
    const catIdx = mapping.indexOf('category')
    if (nameIdx === -1) { toast.error('Must map a column to Business Name'); return }
    if (catIdx === -1) { toast.error('Must map a column to Category'); return }

    setStep('importing')
    try {
      const rows = allRows.slice(0, 500).map((row) => {
        const obj: Record<string, string | null> = {}
        mapping.forEach((col, i) => {
          if (col !== 'skip') obj[col] = row[i]?.trim() || null
        })
        return obj
      })

      const res = await fetch('/api/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, rows }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Import failed')

      setResult({ imported: data.imported, skipped: data.skipped, total: data.total })
      setStep('done')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed')
      setStep('map')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) handleReset() }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-3.5 w-3.5 mr-1.5" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Leads from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with business contacts. Required columns: Name, Category.
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <label
              htmlFor="csv-file"
              className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <FileText className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Click to upload a CSV file</p>
              <p className="text-xs text-muted-foreground mt-1">Max 500 rows, 5MB</p>
              <input
                id="csv-file"
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">Expected columns (any order):</p>
              <div className="flex flex-wrap gap-1">
                {['Name *', 'Category *', 'Address', 'City', 'State', 'Phone', 'Email', 'Website URL'].map((c) => (
                  <Badge key={c} variant="secondary" className="font-mono text-xs">{c}</Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 'map' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{filename}</span>
              <Badge variant="secondary">{allRows.length} rows</Badge>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 ml-auto" onClick={handleReset}>
                <X className="h-3 w-3" />
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Map CSV columns to fields:</p>
              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                {headers.map((h, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="text-xs text-muted-foreground truncate w-28 shrink-0" title={h}>
                      {h || `Column ${i + 1}`}
                    </div>
                    <Select
                      value={mapping[i]}
                      onValueChange={(v) => setMapping((prev) => {
                        const next = [...prev]
                        next[i] = v as ColumnKey
                        return next
                      })}
                    >
                      <SelectTrigger className="h-7 text-xs flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COLUMN_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="text-xs">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            {previewRows.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Preview (first {previewRows.length} rows):</p>
                <div className="overflow-x-auto rounded border text-xs">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        {headers.map((h, i) => (
                          <th key={i} className="px-2 py-1.5 text-left font-medium whitespace-nowrap">{h || `Col ${i + 1}`}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {previewRows.map((row, ri) => (
                        <tr key={ri}>
                          {row.map((cell, ci) => (
                            <td key={ci} className="px-2 py-1.5 text-muted-foreground max-w-[120px] truncate">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {allRows.length > 500 && (
              <div className="flex items-center gap-2 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Only the first 500 rows will be imported.
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleImport}>
                <Upload className="h-4 w-4 mr-1.5" />
                Import {Math.min(allRows.length, 500)} rows
              </Button>
              <Button variant="ghost" onClick={handleReset}>Cancel</Button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Importing leads…</p>
          </div>
        )}

        {step === 'done' && result && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 py-6">
              <CheckCircle className="h-10 w-10 text-green-500" />
              <div className="text-center">
                <p className="text-lg font-semibold">Import complete</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {result.imported} imported · {result.skipped} skipped (duplicates) · {result.total} total
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => { setOpen(false); handleReset(); router.push('/leads') }}>
                View Leads
              </Button>
              <Button variant="outline" onClick={handleReset}>Import Another File</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
