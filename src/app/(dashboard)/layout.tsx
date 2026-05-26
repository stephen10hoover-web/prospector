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

  // Fetch plan non-blocking — default to 'free' on error
  let plan: 'free' | 'pro' = 'free'
  try {
    const adminClient = createAdminClient()
    const { data: sub } = await adminClient
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', session.user.id)
      .single()
    if (sub?.plan === 'pro' && (sub.status === 'active' || sub.status === 'trialing')) {
      plan = 'pro'
    }
  } catch {
    // Non-fatal
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar userEmail={session.user.email ?? ''} userId={session.user.id} plan={plan} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
