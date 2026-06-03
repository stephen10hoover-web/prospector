import { requireSuperAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase-server'
import { PLAN_META } from '@/lib/plans'
import Link from 'next/link'
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

async function getUsers(search: string, plan: string, status: string) {
  const admin = createAdminClient()

  const { data: authData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const authUsers = authData?.users ?? []

  const [{ data: subs }, { data: profiles }] = await Promise.all([
    admin.from('subscriptions').select('user_id, plan, status, created_at'),
    admin.from('user_profiles').select('id, sending_email, is_suspended, is_banned'),
  ])

  const subMap = new Map((subs ?? []).map((s) => [s.user_id, s]))
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))

  let users = authUsers.map((u) => {
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
      is_suspended: profile?.is_suspended ?? false,
      is_banned: profile?.is_banned ?? false,
    }
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  if (search) {
    const q = search.toLowerCase()
    users = users.filter((u) => u.email.toLowerCase().includes(q) || (u.sending_email?.toLowerCase().includes(q) ?? false))
  }
  if (plan) users = users.filter((u) => u.plan === plan)
  if (status) users = users.filter((u) => u.status === status)

  return users
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; plan?: string; status?: string }>
}) {
  await requireSuperAdmin('admin_users')
  const sp = await searchParams
  const search = sp.search ?? ''
  const plan = sp.plan ?? ''
  const status = sp.status ?? ''
  const users = await getUsers(search, plan, status)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-sm text-white/40 mt-0.5">{users.length.toLocaleString()} matching accounts</p>
        </div>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-2">
        <input
          name="search"
          defaultValue={search}
          placeholder="Search by email..."
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30 w-56"
        />
        <select
          name="plan"
          defaultValue={plan}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-white/30"
        >
          <option value="" className="bg-[#0a0a0b]">All Plans</option>
          {(Object.keys(PLAN_META) as PlanId[]).map((p) => (
            <option key={p} value={p} className="bg-[#0a0a0b]">{PLAN_META[p].name}</option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={status}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-white/30"
        >
          <option value="" className="bg-[#0a0a0b]">All Statuses</option>
          {['active', 'trialing', 'canceled', 'past_due', 'expired'].map((s) => (
            <option key={s} value={s} className="bg-[#0a0a0b]">{s}</option>
          ))}
        </select>
        <button
          type="submit"
          className="px-3 py-1.5 rounded-lg bg-white/10 text-white/70 hover:bg-white/15 text-sm transition-colors"
        >
          Filter
        </button>
        {(search || plan || status) && (
          <a
            href="/internal/core/ops/console/users"
            className="px-3 py-1.5 rounded-lg bg-white/5 text-white/40 hover:text-white/70 text-sm transition-colors"
          >
            Clear
          </a>
        )}
      </form>

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {['Email', 'Plan', 'Status', 'Flags', 'Joined', 'Last Active'].map((col) => (
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
                    <Link
                      href={`/internal/core/ops/console/users/${user.id}`}
                      className="text-white/80 font-mono text-xs hover:text-white transition-colors"
                    >
                      {user.email}
                    </Link>
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
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {user.is_banned && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">ban</span>
                      )}
                      {!user.is_banned && user.is_suspended && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">suspended</span>
                      )}
                    </div>
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
          <p className="px-5 py-10 text-sm text-white/30 text-center">No users found</p>
        )}
      </div>
    </div>
  )
}
