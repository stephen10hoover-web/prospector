import { HelpCircle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface InfoTooltipProps {
  content: string
  side?: 'top' | 'right' | 'bottom' | 'left'
}

export function InfoTooltip({ content, side = 'top' }: InfoTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-help shrink-0" />
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs text-xs">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
