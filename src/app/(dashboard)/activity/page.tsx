'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Activity, ChevronRight } from 'lucide-react'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  const mo = Math.floor(d / 30)
  return `${mo}mo ago`
}

interface ActivityItem {
  id: string
  type: string
  note: string | null
  created_at: string
  business_id: string
  businesses: { name: string; city: string | null } | null
}

const PAGE_SIZE = 50

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)

  const fetchActivities = useCallback(async (currentOffset: number, append: boolean) => {
    if (append) setLoadingMore(true)
    else setLoading(true)

    try {
      const res = await fetch(`/api/activity?limit=${PAGE_SIZE}&offset=${currentOffset}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data: ActivityItem[] = await res.json()
      if (append) {
        setActivities((prev) => [...prev, ...data])
      } else {
        setActivities(data)
      }
      setHasMore(data.length === PAGE_SIZE)
      setOffset(currentOffset + data.length)
    } catch {
      // Non-fatal
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    fetchActivities(0, false)
  }, [fetchActivities])

  function formatType(type: string): string {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Activity Feed"
        description="A timeline of all actions across your leads."
      />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : activities.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No activity yet"
          description="Actions like emails sent, notes added, and stage changes will appear here."
        />
      ) : (
        <Card>
          <CardContent className="p-0 divide-y">
            {activities.map((item) => (
              <div key={item.id} className="flex items-start gap-3 px-4 py-3">
                <div className="mt-0.5 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Activity className="h-3 w-3 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-medium">{formatType(item.type)}</span>
                    {item.businesses && (
                      <>
                        <span className="text-muted-foreground text-sm">on</span>
                        <Link
                          href={`/leads/${item.business_id}`}
                          className="text-sm text-primary hover:underline flex items-center gap-0.5"
                        >
                          {item.businesses.name}
                          {item.businesses.city && (
                            <span className="text-muted-foreground text-xs"> · {item.businesses.city}</span>
                          )}
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      </>
                    )}
                  </div>
                  {item.note && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.note}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {timeAgo(item.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {hasMore && !loading && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchActivities(offset, true)}
            disabled={loadingMore}
          >
            {loadingMore ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : null}
            Load more
          </Button>
        </div>
      )}
    </div>
  )
}
