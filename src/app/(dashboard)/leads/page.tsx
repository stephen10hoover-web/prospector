import { Suspense } from 'react'
import { createServerClient } from '@/lib/supabase-server'
import { LeadsTable } from '@/components/leads/LeadsTable'
import { LeadFilters } from '@/components/leads/LeadFilters'
import { ExportButton } from '@/components/leads/ExportButton'
import { ImportButton } from '@/components/leads/ImportButton'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Business } from '@/types'

const PAGE_SIZE = 100

type SearchParams = {
    category?: string
    city?: string
    status?: string
    minScore?: string
    maxScore?: string
    search_id?: string
    page?: string
  }

interface LeadsPageProps {
  searchParams: Promise<SearchParams>
}

async function getLeads(
  userId: string,
  filters: SearchParams
): Promise<{ leads: Business[]; total: number }> {
  const supabase = await createServerClient()
  const page = Math.max(1, parseInt(filters.page ?? '1'))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('businesses')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('lead_score', { ascending: false })
    .range(from, to)

  if (filters.search_id) query = query.eq('search_id', filters.search_id)
  if (filters.category) query = query.ilike('category', `%${filters.category}%`)
  if (filters.city) query = query.ilike('city', `%${filters.city}%`)
  if (filters.status) query = query.eq('outreach_status', filters.status)
  if (filters.minScore) query = query.gte('lead_score', parseInt(filters.minScore))
  if (filters.maxScore) query = query.lte('lead_score', parseInt(filters.maxScore))

  const { data, count } = await query
  return { leads: (data as Business[]) ?? [], total: count ?? 0 }
}

export default async function LeadsPage({ searchParams: searchParamsPromise }: LeadsPageProps) {
  const searchParams = await searchParamsPromise
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const page = Math.max(1, parseInt(searchParams.page ?? '1'))
  const { leads, total } = await getLeads(user!.id, searchParams)
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground mt-1">
            {total} businesses found
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton filters={searchParams} totalLeads={total} />
          <ImportButton />
          <Button asChild>
            <Link href="/search">
              <Search className="h-4 w-4 mr-2" />
              New Search
            </Link>
          </Button>
        </div>
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
          <>
            <LeadsTable leads={leads} />
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages} · {total} total leads
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    disabled={page <= 1}
                  >
                    <Link
                      href={`/leads?${new URLSearchParams({ ...searchParams, page: String(page - 1) }).toString()}`}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    disabled={page >= totalPages}
                  >
                    <Link
                      href={`/leads?${new URLSearchParams({ ...searchParams, page: String(page + 1) }).toString()}`}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Suspense>
    </div>
  )
}
