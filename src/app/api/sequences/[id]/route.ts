export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('sequences')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user!.id)

  if (error) {
    console.error('[sequences] delete error:', error.message)
    return NextResponse.json({ error: 'Failed to delete sequence' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
