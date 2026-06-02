import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase-server'
import { PrintButton } from '@/components/audit/PrintButton'
import { Badge } from '@/components/ui/badge'
import { TrackProposalView } from '@/components/proposal/TrackProposalView'
import type { Proposal, ProposalContent, ProposalPackage } from '@/types'

interface ProposalPageProps {
  params: { token: string }
}

function formatPrice(price: number, billing: ProposalPackage['billing']): string {
  const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(price)
  switch (billing) {
    case 'monthly': return `${formatted}/mo`
    case 'quarterly': return `${formatted}/quarter`
    default: return formatted
  }
}

export default async function ProposalPage({ params }: ProposalPageProps) {
  const supabase = createAdminClient()

  const { data: proposal } = await supabase
    .from('proposals')
    .select('*, businesses(name, city, state, category)')
    .eq('share_token', params.token)
    .single()

  if (!proposal) notFound()

  const p = proposal as Proposal & { businesses: { name: string; city: string; state: string; category: string } }
  const content = p.content as ProposalContent

  return (
    <>
      {/* Auto-fire view tracking via client component (avoids dangerouslySetInnerHTML) */}
      <TrackProposalView token={params.token} />

      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Header */}
          <div className="bg-white rounded-xl border p-8 print:shadow-none">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{p.title}</h1>
                <p className="text-gray-500 mt-1">
                  Prepared for <strong>{p.businesses?.name}</strong>
                  {p.businesses?.city && ` · ${p.businesses.city}, ${p.businesses.state}`}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Generated {new Date(p.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <PrintButton />
            </div>

            {content.intro && (
              <div className="prose prose-sm max-w-none text-gray-700">
                <p className="whitespace-pre-wrap leading-relaxed">{content.intro}</p>
              </div>
            )}
          </div>

          {/* Services */}
          {content.services?.length > 0 && (
            <div className="bg-white rounded-xl border p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">What We&apos;ll Deliver</h2>
              <div className="grid gap-3">
                {content.services.map((service, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${service.included ? 'bg-green-100' : 'bg-gray-100'}`}>
                      <span className={`text-xs ${service.included ? 'text-green-600' : 'text-gray-400'}`}>
                        {service.included ? '✓' : '–'}
                      </span>
                    </div>
                    <div>
                      <p className={`font-medium ${service.included ? '' : 'text-gray-400 line-through'}`}>{service.name}</p>
                      {service.description && (
                        <p className="text-sm text-gray-500">{service.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pricing Packages */}
          {content.packages?.length > 0 && (
            <div className="bg-white rounded-xl border p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Investment</h2>
              <div className={`grid gap-4 ${content.packages.length > 1 ? 'md:grid-cols-' + Math.min(content.packages.length, 3) : ''}`}>
                {content.packages.map((pkg, i) => (
                  <div
                    key={i}
                    className={`rounded-lg border p-6 relative ${pkg.recommended ? 'border-blue-500 ring-1 ring-blue-500' : ''}`}
                  >
                    {pkg.recommended && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-blue-600 text-white text-xs px-3">Recommended</Badge>
                      </div>
                    )}
                    <div className="mb-4">
                      <h3 className="font-bold text-lg">{pkg.name}</h3>
                      <p className="text-2xl font-bold text-blue-600 mt-1">{formatPrice(pkg.price, pkg.billing)}</p>
                    </div>
                    {pkg.features.length > 0 && (
                      <ul className="space-y-2">
                        {pkg.features.map((f, fi) => (
                          <li key={fi} className="flex items-center gap-2 text-sm">
                            <span className="text-green-500">✓</span>
                            {f}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* About */}
          {content.about && (
            <div className="bg-white rounded-xl border p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">About Us</h2>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm">{content.about}</p>
            </div>
          )}

          {/* Next Steps */}
          {content.next_steps && (
            <div className="bg-blue-50 rounded-xl border border-blue-100 p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Next Steps</h2>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm">{content.next_steps}</p>
            </div>
          )}

          <p className="text-center text-xs text-gray-400 pb-4">
            Proposal generated with Prospector
          </p>
        </div>
      </div>
    </>
  )
}
