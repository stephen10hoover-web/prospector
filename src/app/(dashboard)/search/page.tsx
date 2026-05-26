import { SearchForm } from '@/components/search/SearchForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Search } from 'lucide-react'

export default function SearchPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Search Leads</h1>
        <p className="text-muted-foreground mt-1">
          Discover local businesses that need your services
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Search className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Find Businesses</CardTitle>
              <CardDescription>
                Search by category and location to find high-opportunity leads
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <SearchForm />
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">AI-Scored</p>
              <p className="text-xs text-muted-foreground mt-1">Every lead gets a quality score</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">Instant</p>
              <p className="text-xs text-muted-foreground mt-1">Results in seconds</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">Actionable</p>
              <p className="text-xs text-muted-foreground mt-1">AI-written outreach ready to send</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
