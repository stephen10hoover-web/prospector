export default function SettingsLoading() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-28 bg-muted rounded" />
        <div className="h-4 w-56 bg-muted rounded mt-2" />
      </div>

      {[0, 1, 2, 3].map((section) => (
        <div key={section} className="rounded-xl border bg-card p-6 space-y-4">
          <div className="h-5 w-36 bg-muted rounded" />
          <div className="h-px bg-muted" />
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex items-center justify-between py-1">
              <div className="space-y-1.5">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-3 w-48 bg-muted rounded" />
              </div>
              <div className="h-9 w-24 bg-muted rounded-md" />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
