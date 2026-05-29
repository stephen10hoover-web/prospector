import { requireSuperAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase-server'
import { PLAN_META } from '@/lib/plans'
import type { PlanId } from '@/lib/plans'

const PLAN_BADGE: Record<PlanId, string> = {
  free_trial: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  pro:        'bg-blue-500/20 text-blue-300 border-blue-500/30',
  team:       'bg-purple-500/20 text-purple-300 border-purple-500/30',
}

const STATUS_BADGE: Record<string, string> = {
  active:   'bg-green-500/20 text-green-300',
  trialing: 'bg-yellow-500/20 text-yellow-300',
  canceled: 'bg-red-500/20 text-red-300',
  past_due: 'bg-orange-500/20 text-orange-300',
  expired:  'bg-red-500/20 text-red-300',
}

async function getUsers() {
  const admin = createAdminClient()

  const { data: authData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const authUsers = authData?.users ?? []

  const [{ data: subs }, { data: profiles }] = await Promise.all([
    admin.from('subscriptions').select('user_id, plan, status, created_at'),
    admin.from('user_profiles').select('id, sending_email'),
  ])

  const subMap = new Map((subs ?? []).map((s) => [s.user_id, s]))
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))

  return authUsers
    .map((u) => {
      const sub = subMap.get(u.id)
      const profile = profileMap.get(u.id)
      return {
        id: u.id,
        email: u.email ?? '—',
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        plan: (sub?.plan ?? 'free_trial') as PlanId,
        status: sub?.status ?? 'trialing',
        sending_email: profile?.sending_email ?? null,
      }
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export default async function AdminUsersPage() {
  await requireSuperAdmin('admin_users')
  const users = await getUsers()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-sm text-white/40 mt-0.5">{users.length.toLocaleString()} total accounts</p>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {['Email', 'Sending Address', 'Plan', 'Status', 'Joined', 'Last Active'].map((col) => (
                  <th key={col} className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-white/80 font-mono text-xs">{user.email}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-white/40 font-mono text-xs">{user.sending_email ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PLAN_BADGE[user.plan]}`}>
                      {PLAN_META[user.plan].name}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[user.status] ?? 'bg-white/10 text-white/50'}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/40 text-xs">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-white/30 text-xs">
                    {user.last_sign_in_at
                      ? new Date(user.last_sign_in_at).toLocaleDateString()
                      : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && (
          <p className="px-5 py-10 text-sm text-white/30 text-center">No users yet</p>
        )}
      </div>
    </div>
  )
}
