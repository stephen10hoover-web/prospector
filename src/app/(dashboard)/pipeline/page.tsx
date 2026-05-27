import { createServerClient } from '@/lib/supabase-server'
import { KanbanBoard } from '@/components/pipeline/KanbanBoard'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Search, Kanban } from 'lucide-react'
import type { Business } from '@/types'

export default async function PipelinePage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const { data } = await supabase
    .from('businesses')
    .select('id, name, category, city, state, rating, lead_score, has_website, outreach_status, pipeline_stage')
    .eq('user_id', session.user.id)
    .not('pipeline_stage', 'eq', 'new_lead')
    .order('lead_score', { ascending: false })
    .limit(300)

  // Also grab new leads (high score ones worth showing)
  const { data: newLeads } = await supabase
    .from('businesses')
    .select('id, name, category, city, state, rating, lead_score, has_website, outreach_status, pipeline_stage')
    .eq('user_id', session.user.id)
    .eq('pipeline_stage', 'new_lead')
    .order('lead_score', { ascending: false })
    .limit(50)

  const allLeads = [...(data ?? []), ...(newLeads ?? [])] as (Business & { pipeline_stage: string })[]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Kanban className="h-7 w-7" />
            Pipeline
          </h1>
          <p className="text-muted-foreground mt-1">
            Drag leads across stages to track your deals. {allLeads.length} leads in pipeline.
          </p>
        </div>
        <Button asChild>
          <Link href="/search">
            <Search className="h-4 w-4 mr-2" />
            Find More Leads
          </Link>
        </Button>
      </div>

      {allLeads.length === 0 ? (
        <div className="text-center py-20 border rounded-xl bg-muted/20">
          <Kanban className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium mb-2">Pipeline is empty</p>
          <p className="text-sm text-muted-foreground mb-6">
            Search for leads to start filling your pipeline.
          </p>
          <Button asChild>
            <Link href="/search">Find Leads</Link>
          </Button>
        </div>
      ) : (
        <KanbanBoard initialLeads={allLeads as unknown as Business[]} />
      )}
    </div>
  )
}
