import { requireSuperAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase-server'
import Link from 'next/link'

const SEVERITY_BADGE: Record<string, string> = {
  info:     'bg-blue-500/20 text-blue-300 border-blue-500/30',
  warning:  'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  critical: 'bg-red-500/20 text-red-300 border-red-500/30',
}

const PAGE_SIZE = 50

async function getAuditLogs(
  cursor: string | null,
  severity: string,
  action: string,
  actor: string,
) {
  const admin = createAdminClient()

  let query = admin
    .from('audit_logs')
    .select('id, created_at, severity, action, actor_email, ip_address, resource_type, resource_id', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE + 1) // fetch one extra to detect hasMore

  if (cursor) query = query.lt('created_at', cursor)
  if (severity) query = query.eq('severity', severity)
  if (action) query = query.ilike('action', `%${action}%`)
  if (actor) query = query.ilike('actor_email', `%${actor}%`)

  const { data, count } = await query

  const rows = data ?? []
  const hasMore = rows.length > PAGE_SIZE
  if (hasMore) rows.pop()

  return { logs: rows, total: count ?? 0, hasMore, nextCursor: hasMore ? rows[rows.length - 1]?.created_at : null }
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    cursor?: string
    severity?: string
    action?: string
    actor?: string
  }>
}) {
  await requireSuperAdmin('admin_audit')

  const sp = await searchParams
  const cursor = sp.cursor ?? null
  const severity = sp.severity ?? ''
  const action = sp.action ?? ''
  const actor = sp.actor ?? ''

  const { logs, total, hasMore, nextCursor } = await getAuditLogs(cursor, severity, action, actor)

  function buildUrl(params: Record<string, string>) {
    const p = new URLSearchParams()
    if (severity) p.set('severity', severity)
    if (action) p.set('action', action)
    if (actor) p.set('actor', actor)
    Object.entries(params).forEach(([k, v]) => { if (v) p.set(k, v); else p.delete(k) })
    const str = p.toString()
    return `/internal/core/ops/console/audit${str ? `?${str}` : ''}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Log</h1>
          <p className="text-sm text-white/40 mt-0.5">
            {total.toLocaleString()} immutable events · append-only · tamper-proof
          </p>
        </div>
        <ExportButton severity={severity} action={action} actor={actor} />
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-2">
        <select
          name="severity"
          defaultValue={severity}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-white/30"
        >
          <option value="" className="bg-[#0a0a0b]">All Severities</option>
          {['info', 'warning', 'critical'].map((s) => (
            <option key={s} value={s} className="bg-[#0a0a0b]">{s}</option>
          ))}
        </select>
        <input
          name="action"
          defaultValue={action}
          placeholder="Filter by action..."
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30 w-52"
        />
        <input
          name="actor"
          defaultValue={actor}
          placeholder="Filter by actor email..."
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30 w-52"
        />
        <button
          type="submit"
          className="px-3 py-1.5 rounded-lg bg-white/10 text-white/70 hover:bg-white/15 text-sm transition-colors"
        >
          Filter
        </button>
        {(severity || action || actor) && (
          <Link
            href="/internal/core/ops/console/audit"
            className="px-3 py-1.5 rounded-lg bg-white/5 text-white/40 hover:text-white/70 text-sm transition-colors"
          >
            Clear
          </Link>
        )}
      </form>

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
                <tr key={log.id} className="hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${SEVERITY_BADGE[log.severity] ?? SEVERITY_BADGE.info}`}>
                      {log.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-white/80 font-mono text-xs">{log.action}</span>
                    {log.resource_type && (
                      <span className="text-white/30 font-mono text-xs ml-2">
                        [{log.resource_type}{log.resource_id ? `:${String(log.resource_id).slice(0, 8)}` : ''}]
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
          <p className="px-5 py-10 text-sm text-white/30 text-center">No audit events match your filters</p>
        )}

        {/* Cursor-based pagination */}
        <div className="px-5 py-4 border-t border-white/10 flex items-center justify-between">
          <p className="text-xs text-white/30">
            {total.toLocaleString()} total events · showing {logs.length}
          </p>
          <div className="flex gap-2">
            {cursor && (
              <Link
                href={buildUrl({ cursor: '' })}
                className="text-xs px-3 py-1.5 rounded bg-white/10 text-white/70 hover:bg-white/15 transition-colors"
              >
                ← First Page
              </Link>
            )}
            {hasMore && nextCursor && (
              <Link
                href={buildUrl({ cursor: nextCursor })}
                className="text-xs px-3 py-1.5 rounded bg-white/10 text-white/70 hover:bg-white/15 transition-colors"
              >
                Next {PAGE_SIZE} →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Client component for export — keeps server component clean
function ExportButton({ severity, action, actor }: { severity: string; action: string; actor: string }) {
  // Using a plain form POST for simplicity — server will respond with CSV or JSON
  return (
    <form
      method="POST"
      action="/api/internal/audit/export"
      target="_blank"
      className="inline"
    >
      {severity && <input type="hidden" name="severity" value={severity} />}
      {action && <input type="hidden" name="action" value={action} />}
      {actor && <input type="hidden" name="actor" value={actor} />}
      <button
        type="submit"
        className="text-xs px-3 py-1.5 rounded-lg bg-white/10 text-white/60 hover:bg-white/15 transition-colors"
      >
        Export CSV
      </button>
    </form>
  )
}
