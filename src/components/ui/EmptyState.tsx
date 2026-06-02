import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: React.ElementType
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      {Icon && (
        <div className="bg-primary/5 rounded-full p-4 mb-4">
          <Icon className="h-10 w-10 text-primary/40" />
        </div>
      )}
      <p className="text-base font-medium text-foreground mb-1">{title}</p>
      {description && (
        <p className="text-sm text-muted-foreground max-w-xs mb-6">{description}</p>
      )}
      {action}
    </div>
  )
}
