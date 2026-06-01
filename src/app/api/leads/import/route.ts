export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { z } from 'zod'

const MAX_ROWS = 500

const rowSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().min(1).max(200),
  address: z.string().max(500).optional().default(''),
  city: z.string().max(200).optional().default(''),
  state: z.string().max(100).optional().default(''),
  phone: z.string().max(50).nullable().optional(),
  email: z.string().email().max(254).nullable().optional(),
  website_url: z.string().url().max(500).nullable().optional()
    .or(z.literal('').transform(() => null)),
})

const importSchema = z.object({
  filename: z.string().max(255).optional(),
  rows: z.array(rowSchema).min(1).max(MAX_ROWS),
})

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = importSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { filename, rows } = parsed.data
  const admin = createAdminClient()

  // Create a virtual search record for this import batch
  const { data: searchRow, error: searchErr } = await admin
    .from('searches')
    .insert({
      user_id: user!.id,
      category: 'Import',
      location: filename ?? 'CSV Import',
      radius: 0,
      result_count: rows.length,
      status: 'completed',
    })
    .select('id')
    .single()

  if (searchErr || !searchRow) {
    return NextResponse.json({ error: 'Failed to create import batch' }, { status: 500 })
  }

  // Create import job record
  const { data: importJob } = await admin
    .from('import_jobs')
    .insert({
      user_id: user!.id,
      filename: filename ?? null,
      status: 'processing',
      total_rows: rows.length,
      search_id: searchRow.id,
    })
    .select('id')
    .single()

  // Deduplicate: find existing businesses with same name + city for this user
  const nameCityPairs = rows.map((r) => `${r.name.toLowerCase().trim()}|${(r.city ?? '').toLowerCase().trim()}`)

  const { data: existingLeads } = await admin
    .from('businesses')
    .select('name, city')
    .eq('user_id', user!.id)

  const existingSet = new Set(
    (existingLeads ?? []).map(
      (b) => `${String(b.name).toLowerCase().trim()}|${String(b.city ?? '').toLowerCase().trim()}`
    )
  )

  // Build insert batch, skipping duplicates
  const toInsert: Record<string, unknown>[] = []
  const skipped: number[] = []

  rows.forEach((row, idx) => {
    const key = nameCityPairs[idx]
    if (existingSet.has(key)) {
      skipped.push(idx)
      return
    }
    toInsert.push({
      search_id: searchRow.id,
      user_id: user!.id,
      name: row.name.trim(),
      category: row.category.trim(),
      address: row.address?.trim() ?? '',
      city: row.city?.trim() ?? '',
      state: row.state?.trim() ?? '',
      phone: row.phone?.trim() || null,
      phone_source: row.phone?.trim() ? 'import' : null,
      email: row.email?.toLowerCase().trim() || null,
      email_source: row.email?.trim() ? 'manual' : null,
      website_url: row.website_url || null,
      has_website: !!(row.website_url),
      lead_score: 0,
      website_quality_score: 0,
      outreach_status: 'not_contacted',
      pipeline_stage: 'new_lead',
      import_job_id: importJob?.id ?? null,
    })
  })

  let importedCount = 0
  if (toInsert.length > 0) {
    const { data: inserted } = await admin
      .from('businesses')
      .insert(toInsert)
      .select('id')

    importedCount = inserted?.length ?? toInsert.length
  }

  // Update import job status
  if (importJob) {
    await admin
      .from('import_jobs')
      .update({
        status: 'completed',
        imported_rows: importedCount,
        skipped_rows: skipped.length,
        completed_at: new Date().toISOString(),
      })
      .eq('id', importJob.id)

    // Log activity for each imported lead (batch insert)
    if (toInsert.length > 0) {
      const activityRows = toInsert.map((b) => ({
        business_id: null, // will be set after we know the IDs
        user_id: user!.id,
        type: 'imported',
        metadata: { import_job_id: importJob.id, filename: filename ?? null },
      }))
      // Fetch the newly created businesses to get their IDs
      const { data: newBusinesses } = await admin
        .from('businesses')
        .select('id')
        .eq('import_job_id', importJob.id)
        .eq('user_id', user!.id)

      if (newBusinesses?.length) {
        const activities = newBusinesses.map((b) => ({
          business_id: b.id,
          user_id: user!.id,
          type: 'imported' as const,
          metadata: { import_job_id: importJob.id, filename: filename ?? null },
        }))
        await admin.from('lead_activities').insert(activities).then(null, () => null)
      }
    }
  }

  return NextResponse.json({
    ok: true,
    imported: importedCount,
    skipped: skipped.length,
    total: rows.length,
    search_id: searchRow.id,
    import_job_id: importJob?.id ?? null,
  })
}

// Get import history
export async function GET(_request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('import_jobs')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json(data ?? [])
}
