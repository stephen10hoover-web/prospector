export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div>
        <div className="h-8 w-40 bg-muted rounded" />
        <div className="h-4 w-64 bg-muted rounded mt-2" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-6 space-y-3">
            <div className="flex justify-between">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-8 w-8 bg-muted rounded-lg" />
            </div>
            <div className="h-7 w-16 bg-muted rounded" />
            <div className="h-3 w-28 bg-muted rounded" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="h-5 w-36 bg-muted rounded" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-muted rounded-md" />
              <div className="space-y-1.5">
                <div className="h-4 w-40 bg-muted rounded" />
                <div className="h-3 w-24 bg-muted rounded" />
              </div>
            </div>
            <div className="h-6 w-20 bg-muted rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
