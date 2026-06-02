const STAGES = ['New', 'Contacted', 'Replied', 'Qualified', 'Won', 'Lost']

export default function PipelineLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-40 bg-muted rounded" />
        <div className="h-4 w-56 bg-muted rounded mt-2" />
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => (
          <div key={stage} className="shrink-0 w-[260px] rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-20 bg-muted rounded" />
              <div className="h-5 w-7 bg-muted rounded-full" />
            </div>
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <div className="h-4 w-36 bg-muted rounded" />
                <div className="h-3 w-24 bg-muted rounded" />
                <div className="h-5 w-16 bg-muted rounded-full" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
