import { Suspense } from 'react'
import { createServerClient } from '@/lib/supabase-server'
import { LeadsTable } from '@/components/leads/LeadsTable'
import { LeadFilters } from '@/components/leads/LeadFilters'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Search } from 'lucide-react'
import type { Business } from '@/types'

interface LeadsPageProps {
  searchParams: {
    category?: string
    city?: string
    status?: string
    minScore?: string
    maxScore?: string
    search_id?: string
  }
}

async function getLeads(userId: string, filters: LeadsPageProps['searchParams']): Promise<Business[]> {
  const supabase = createServerClient()

  let query = supabase
    .from('businesses')
    .select('*')
    .eq('user_id', userId)
    .order('lead_score', { ascending: false })

  if (filters.search_id) {
    query = query.eq('search_id', filters.search_id)
  }
  if (filters.category) {
    query = query.ilike('category', `%${filters.category}%`)
  }
  if (filters.city) {
    query = query.ilike('city', `%${filters.city}%`)
  }
  if (filters.status) {
    query = query.eq('outreach_status', filters.status)
  }
  if (filters.minScore) {
    query = query.gte('lead_score', parseInt(filters.minScore))
  }
  if (filters.maxScore) {
    query = query.lte('lead_score', parseInt(filters.maxScore))
  }

  const { data } = await query.limit(200)
  return (data as Business[]) ?? []
}

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) return null

  const leads = await getLeads(session.user.id, searchParams)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground mt-1">
            {leads.length} businesses found
          </p>
        </div>
        <Button asChild>
          <Link href="/search">
            <Search className="h-4 w-4 mr-2" />
            New Search
          </Link>
        </Button>
      </div>

      <LeadFilters initialFilters={searchParams} />

      <Suspense fallback={<div className="text-muted-foreground">Loading leads...</div>}>
        {leads.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground border rounded-lg bg-muted/20">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium mb-2">No leads found</p>
            <p className="text-sm mb-6">Try adjusting your filters or run a new search to find businesses.</p>
            <Button asChild>
              <Link href="/search">Run a Search</Link>
            </Button>
          </div>
        ) : (
          <LeadsTable leads={leads} />
        )}
      </Suspense>
    </div>
  )
}
