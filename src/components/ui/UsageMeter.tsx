import { cn } from '@/lib/utils'
import { InfoTooltip } from './InfoTooltip'

interface UsageMeterProps {
  label: string
  used: number
  limit: number
  period?: 'week' | 'month'
  tooltip?: string
  className?: string
}

export function UsageMeter({ label, used, limit, period, tooltip, className }: UsageMeterProps) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0
  const remaining = Math.max(0, limit - used)
  const color =
    pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : 'bg-primary'

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1.5">
          <span className="font-medium">{label}</span>
          {tooltip && <InfoTooltip content={tooltip} />}
        </div>
        <span className="text-muted-foreground text-xs">
          {used} / {limit}{period ? ` per ${period}` : ''}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-300', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {remaining} {label.toLowerCase()} remaining{period ? ` this ${period}` : ''}
      </p>
    </div>
  )
}
