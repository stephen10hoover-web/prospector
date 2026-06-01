export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1).max(100).trim(),
})

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Get workspaces user belongs to
  const { data: memberships } = await admin
    .from('workspace_members')
    .select('role, workspaces(id, name, slug, owner_id, created_at)')
    .eq('user_id', user!.id)

  const workspaces = (memberships ?? []).map((m) => ({
    ...(m.workspaces as unknown as Record<string, unknown>),
    role: m.role,
  }))

  return NextResponse.json(workspaces)
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
  }

  const slug = parsed.data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)

  const admin = createAdminClient()

  const { data: workspace, error } = await admin
    .from('workspaces')
    .insert({ name: parsed.data.name, slug, owner_id: user!.id })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A workspace with that name already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 })
  }

  // Add creator as owner member
  await admin
    .from('workspace_members')
    .insert({ workspace_id: workspace.id, user_id: user!.id, role: 'owner' })
    .then(null, () => null)

  return NextResponse.json(workspace, { status: 201 })
}
