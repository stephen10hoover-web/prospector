import { Skeleton } from '@/components/ui/skeleton'

export default function ActivityLoading() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="border rounded-lg divide-y">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-3">
            <Skeleton className="h-6 w-6 rounded-full shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
