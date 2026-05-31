import { redirect } from 'next/navigation'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { Sidebar } from '@/components/layout/Sidebar'
import { SequenceProcessor } from '@/components/layout/SequenceProcessor'
import { getUserPlanStatus } from '@/lib/usage'
import { isSuperAdmin } from '@/lib/admin'
import type { PlanId } from '@/lib/plans'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  if (!user.email_confirmed_at) {
    redirect('/login?error=unverified')
  }

  // Fetch plan and unread count in parallel — both non-blocking
  let plan: PlanId = 'free_trial'
  let inboxUnread = 0
  try {
    const adminClient = createAdminClient()
    const [planStatus, unreadResult] = await Promise.all([
      getUserPlanStatus(user.id),
      adminClient
        .from('inbound_messages')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false),
    ])
    plan = planStatus.planId
    inboxUnread = unreadResult.count ?? 0
  } catch {
    // Non-fatal
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar userEmail={user.email ?? ''} userId={user.id} plan={plan} inboxUnread={inboxUnread} isAdmin={isSuperAdmin(user.email)} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
      <SequenceProcessor userId={user.id} />
    </div>
  )
}
