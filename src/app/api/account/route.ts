export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'

export async function DELETE() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = user?.id
  const admin = createAdminClient()

  try {
    // Delete user data in dependency order (RLS tables first, then auth user)
    await admin.from('outreach_logs').delete().eq('user_id', userId)
    await admin.from('email_suppressions').delete().eq('user_id', userId)
    await admin.from('audit_reports').delete().eq('user_id', userId)
    await admin.from('businesses').delete().eq('user_id', userId)
    await admin.from('searches').delete().eq('user_id', userId)
    await admin.from('profiles').delete().eq('id', userId)
    await admin.from('subscriptions').delete().eq('user_id', userId)
    // consent_logs and billing records are retained per privacy policy

    // Delete the auth user last
    const { error } = await admin.auth.admin.deleteUser(userId)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[account] deletion error:', err)
    return NextResponse.json({ error: 'Failed to delete account. Please contact support.' }, { status: 500 })
  }
}
