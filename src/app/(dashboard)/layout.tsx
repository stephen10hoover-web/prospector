import { redirect } from 'next/navigation'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  // Fetch plan and unread count in parallel — both non-blocking
  let plan: 'free' | 'pro' = 'free'
  let inboxUnread = 0
  try {
    const adminClient = createAdminClient()
    const [subResult, unreadResult] = await Promise.all([
      adminClient
        .from('subscriptions')
        .select('plan, status')
        .eq('user_id', session.user.id)
        .single(),
      adminClient
        .from('inbound_messages')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('read', false),
    ])
    if (
      subResult.data?.plan === 'pro' &&
      (subResult.data.status === 'active' || subResult.data.status === 'trialing')
    ) {
      plan = 'pro'
    }
    inboxUnread = unreadResult.count ?? 0
  } catch {
    // Non-fatal
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar userEmail={session.user.email ?? ''} userId={session.user.id} plan={plan} inboxUnread={inboxUnread} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
