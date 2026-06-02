export default function LeadsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-32 bg-muted rounded" />
          <div className="h-4 w-48 bg-muted rounded mt-2" />
        </div>
        <div className="h-9 w-32 bg-muted rounded-md" />
      </div>

      {/* Filter bar */}
      <div className="flex gap-3">
        <div className="h-9 flex-1 bg-muted rounded-md" />
        <div className="h-9 w-36 bg-muted rounded-md" />
        <div className="h-9 w-28 bg-muted rounded-md" />
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="border-b p-4 flex gap-6">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-4 w-20 bg-muted rounded" />
          ))}
        </div>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b last:border-0">
            <div className="h-9 w-9 bg-muted rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-48 bg-muted rounded" />
              <div className="h-3 w-32 bg-muted rounded" />
            </div>
            <div className="h-6 w-16 bg-muted rounded-full" />
            <div className="h-6 w-14 bg-muted rounded" />
            <div className="h-4 w-8 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
