export default function SequencesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-44 bg-muted rounded" />
          <div className="h-4 w-64 bg-muted rounded mt-2" />
        </div>
        <div className="h-9 w-36 bg-muted rounded-md" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-5 w-40 bg-muted rounded" />
                <div className="h-3 w-28 bg-muted rounded" />
              </div>
              <div className="h-8 w-8 bg-muted rounded-full" />
            </div>
            <div className="flex gap-4">
              <div className="h-3 w-16 bg-muted rounded" />
              <div className="h-3 w-20 bg-muted rounded" />
            </div>
            <div className="h-8 w-full bg-muted rounded-md" />
          </div>
        ))}
      </div>
    </div>
  )
}
