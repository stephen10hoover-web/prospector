import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase-server'
import { PrintButton } from '@/components/audit/PrintButton'
import type { AuditContent, AuditSection } from '@/types'

interface AuditPageProps {
  params: { token: string }
}

function SectionScore({ section }: { section: AuditSection }) {
  const color =
    section.status === 'good'
      ? 'text-green-600 bg-green-50 border-green-200'
      : section.status === 'warning'
      ? 'text-yellow-700 bg-yellow-50 border-yellow-200'
      : 'text-red-600 bg-red-50 border-red-200'

  const badgeColor =
    section.status === 'good'
      ? 'bg-green-100 text-green-700'
      : section.status === 'warning'
      ? 'bg-yellow-100 text-yellow-700'
      : 'bg-red-100 text-red-700'

  return (
    <div className={`border rounded-lg p-5 ${color}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-base">{section.title}</h3>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeColor}`}>
            {section.status.charAt(0).toUpperCase() + section.status.slice(1)}
          </span>
          <span className="font-bold text-lg">{section.score}/100</span>
        </div>
      </div>
      <ul className="space-y-1.5">
        {section.findings.map((finding, i) => (
          <li key={i} className="text-sm flex items-start gap-2">
            <span className="mt-1 shrink-0">•</span>
            {finding}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default async function AuditReportPage({ params }: AuditPageProps) {
  const supabase = createAdminClient()

  const { data: report } = await supabase
    .from('audit_reports')
    .select('content, generated_at, business_id')
    .eq('share_token', params.token)
    .maybeSingle()

  if (!report) notFound()

  const { data: business } = await supabase
    .from('businesses')
    .select('name, category, city, state, website_url')
    .eq('id', report.business_id)
    .single()

  const content = report.content as AuditContent
  const generatedDate = new Date(report.generated_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const overallColor =
    content.overallScore >= 70
      ? 'text-green-600'
      : content.overallScore >= 40
      ? 'text-yellow-600'
      : 'text-red-600'

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      <div className="max-w-3xl mx-auto px-6 py-10 print:py-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 print:mb-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">Web Presence Audit Report</p>
            <h1 className="text-3xl font-bold text-gray-900">{business?.name}</h1>
            <p className="text-gray-600 mt-1">
              {business?.category} &bull; {business?.city}, {business?.state}
            </p>
            {business?.website_url && (
              <p className="text-sm text-gray-500 mt-0.5">{business.website_url}</p>
            )}
          </div>
          <div className="text-right">
            <div className={`text-5xl font-extrabold ${overallColor}`}>{content.overallScore}</div>
            <div className="text-sm text-gray-500">out of 100</div>
            <div className="text-xs text-gray-400 mt-1">Generated {generatedDate}</div>
          </div>
        </div>

        {/* Overview */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-2">Executive Summary</h2>
          <p className="text-gray-700 leading-relaxed">{content.overview}</p>
        </div>

        {/* Sections */}
        <div className="space-y-4 mb-6">
          <h2 className="font-semibold text-gray-900 text-lg">Detailed Analysis</h2>
          {content.sections.map((section, i) => (
            <SectionScore key={i} section={section} />
          ))}
        </div>

        {/* Recommendations */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h2 className="font-semibold text-gray-900 mb-4">Top Recommendations</h2>
          <ol className="space-y-3">
            {content.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                <span className="shrink-0 h-6 w-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                {rec}
              </li>
            ))}
          </ol>
        </div>

        {/* Print button — hidden when printing */}
        <div className="text-center print:hidden">
          <PrintButton />
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 text-center text-xs text-gray-400 print:mt-4">
          Generated by Prospector &bull; prospectorsearches.com
        </div>
      </div>
    </div>
  )
}
