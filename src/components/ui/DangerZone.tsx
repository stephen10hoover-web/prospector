import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DangerZoneProps {
  children: React.ReactNode
  className?: string
}

export function DangerZone({ children, className }: DangerZoneProps) {
  return (
    <div className={cn('rounded-lg border border-destructive/30 bg-destructive/5 p-5', className)}>
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
        <h3 className="text-sm font-semibold text-destructive">Danger Zone</h3>
      </div>
      {children}
    </div>
  )
}
