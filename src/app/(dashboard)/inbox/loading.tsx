export default function InboxLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-24 bg-muted rounded" />
        <div className="h-4 w-48 bg-muted rounded mt-2" />
      </div>

      <div className="rounded-xl border bg-card overflow-hidden divide-y">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-start gap-4 px-4 py-4">
            <div className="h-10 w-10 bg-muted rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div className="h-4 w-36 bg-muted rounded" />
                <div className="h-3 w-20 bg-muted rounded" />
              </div>
              <div className="h-3 w-full bg-muted rounded" />
              <div className="h-3 w-3/4 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
