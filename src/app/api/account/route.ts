export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { deleteUserAccount } from '@/lib/account-deletion'

export async function DELETE() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await deleteUserAccount({ userId: user.id, deletedBy: 'user' })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[account] deletion error:', err)
    return NextResponse.json({ error: 'Failed to delete account. Please contact support.' }, { status: 500 })
  }
}
