export default function AnalyticsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-36 bg-muted rounded" />
        <div className="h-4 w-56 bg-muted rounded mt-2" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-5 space-y-2">
            <div className="h-3 w-20 bg-muted rounded" />
            <div className="h-8 w-14 bg-muted rounded" />
            <div className="h-3 w-16 bg-muted rounded" />
          </div>
        ))}
      </div>

      {/* Chart placeholder */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="h-5 w-32 bg-muted rounded" />
        <div className="h-48 w-full bg-muted/50 rounded-lg" />
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card p-6 space-y-3">
        <div className="h-5 w-28 bg-muted rounded" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4 py-2 border-b last:border-0">
            <div className="h-4 w-40 bg-muted rounded flex-1" />
            <div className="h-4 w-16 bg-muted rounded" />
            <div className="h-4 w-16 bg-muted rounded" />
            <div className="h-6 w-14 bg-muted rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
