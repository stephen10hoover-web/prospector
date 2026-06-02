export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ suppressionId: string }> }
) {
  const { suppressionId } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') ?? 'email'

  const admin = createAdminClient()

  if (type === 'domain') {
    const { error } = await admin
      .from('domain_suppressions')
      .delete()
      .eq('id', suppressionId)
      .eq('added_by', user!.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // For email suppressions, enforce user ownership
  const { error } = await admin
    .from('email_suppressions')
    .delete()
    .eq('id', suppressionId)
    .eq('user_id', user!.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
