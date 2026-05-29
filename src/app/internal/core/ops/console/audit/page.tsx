import { requireSuperAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase-server'

const SEVERITY_BADGE: Record<string, string> = {
  info:     'bg-blue-500/20 text-blue-300 border-blue-500/30',
  warning:  'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  critical: 'bg-red-500/20 text-red-300 border-red-500/30',
}

async function getAuditLogs(page: number, perPage: number) {
  const admin = createAdminClient()
  const { data, count } = await admin
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * perPage, (page + 1) * perPage - 1)

  return { logs: data ?? [], total: count ?? 0 }
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: { page?: string }
}) {
  await requireSuperAdmin('admin_audit')

  const page = Math.max(0, parseInt(searchParams.page ?? '0'))
  const perPage = 50
  const { logs, total } = await getAuditLogs(page, perPage)
  const totalPages = Math.ceil(total / perPage)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Audit Log</h1>
        <p className="text-sm text-white/40 mt-0.5">
          {total.toLocaleString()} immutable events · append-only · tamper-proof
        </p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {['Severity', 'Action', 'Actor', 'IP', 'Timestamp'].map((col) => (
                  <th key={col} className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-white/3 transition-colors group">
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${SEVERITY_BADGE[log.severity] ?? SEVERITY_BADGE.info}`}>
                      {log.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-white/80 font-mono text-xs">{log.action}</span>
                    {log.resource_type && (
                      <span className="text-white/30 font-mono text-xs ml-2">
                        [{log.resource_type}{log.resource_id ? `:${log.resource_id.slice(0, 8)}` : ''}]
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white/50 font-mono text-xs truncate max-w-[180px]">
                    {log.actor_email}
                  </td>
                  <td className="px-4 py-3 text-white/30 font-mono text-xs">
                    {log.ip_address ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-white/30 text-xs whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {logs.length === 0 && (
          <p className="px-5 py-10 text-sm text-white/30 text-center">No audit events yet</p>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-white/10 flex items-center justify-between">
            <p className="text-xs text-white/30">
              Page {page + 1} of {totalPages} · {total.toLocaleString()} events
            </p>
            <div className="flex gap-2">
              {page > 0 && (
                <a
                  href={`?page=${page - 1}`}
                  className="text-xs px-3 py-1.5 rounded bg-white/10 text-white/70 hover:bg-white/15 transition-colors"
                >
                  ← Prev
                </a>
              )}
              {page + 1 < totalPages && (
                <a
                  href={`?page=${page + 1}`}
                  className="text-xs px-3 py-1.5 rounded bg-white/10 text-white/70 hover:bg-white/15 transition-colors"
                >
                  Next →
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
