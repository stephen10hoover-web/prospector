import { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Search, Zap, Users, BarChart3, FileText, Webhook,
  Mail, Shield, HelpCircle, ExternalLink,
} from 'lucide-react'

export const metadata: Metadata = { title: 'Help & Support — Prospector' }

const FAQ = [
  {
    q: 'How does lead scoring work?',
    a: 'Prospector analyzes a business\'s website quality, review count, rating, and other signals to produce a 0–100 quality score. Higher scores = better prospects. Businesses with no website or low review counts typically score higher.',
  },
  {
    q: 'How many searches can I run per month?',
    a: 'Free trial accounts get 5 searches/month and 20 outreach emails. Paid plans unlock more searches, unlimited emails, and advanced features.',
  },
  {
    q: 'Can I import my own leads?',
    a: 'Yes — go to Leads → Import CSV. Your file needs at least a "name" column. Optional columns: website, phone, city, email. Each import creates a virtual search record you can manage like any other.',
  },
  {
    q: 'What is a sequence?',
    a: 'A sequence is an automated series of outreach emails sent over time. You define the steps and delays, then enroll leads. Prospector handles scheduling and tracks opens, clicks, and replies.',
  },
  {
    q: 'How do I avoid spam filters?',
    a: 'Use your own domain email (not Gmail/Yahoo), personalize messages, avoid spammy words, and respect suppressions. Prospector tracks bounces and unsubscribes automatically.',
  },
  {
    q: 'What are suppressions?',
    a: 'Suppressed emails and domains are excluded from all future outreach. When a lead unsubscribes or bounces, they\'re added automatically. You can also add manual suppressions under Settings → Suppressions.',
  },
  {
    q: 'How do proposals work?',
    a: 'From any lead\'s detail page, create a proposal with pricing, services, and a custom message. A public link is generated that you can share. Prospector tracks when the prospect views it.',
  },
  {
    q: 'Can I collaborate with my team?',
    a: 'Yes — create a workspace under Settings → Team and invite teammates by email. Assign roles (admin, member) to control permissions.',
  },
]

const GUIDES = [
  { icon: Search, title: 'Finding Your First Leads', description: 'Run a search by city + business type to discover prospects.' },
  { icon: Users, title: 'Managing Your Lead Pipeline', description: 'Move leads through stages and track deal progress.' },
  { icon: Zap, title: 'Setting Up Outreach Sequences', description: 'Automate follow-ups with multi-step email sequences.' },
  { icon: BarChart3, title: 'Reading Your Analytics', description: 'Understand open rates, click rates, and conversion metrics.' },
  { icon: FileText, title: 'Creating & Sending Proposals', description: 'Generate professional proposals and track views.' },
  { icon: Webhook, title: 'Webhooks & Integrations', description: 'Connect Prospector to Zapier, Make, or your own tools.' },
  { icon: Mail, title: 'Email Deliverability Tips', description: 'Best practices for inbox placement and avoiding spam.' },
  { icon: Shield, title: 'Privacy & Data Management', description: 'Export your data, manage suppressions, or delete your account.' },
]

export default function HelpPage() {
  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        title="Help & Support"
        description="Everything you need to get the most out of Prospector."
      />

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {GUIDES.map((guide) => (
          <Card key={guide.title} className="hover:border-primary/50 transition-colors cursor-default">
            <CardContent className="pt-4 pb-4">
              <guide.icon className="h-5 w-5 text-primary mb-2" />
              <p className="text-sm font-medium leading-snug">{guide.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{guide.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HelpCircle className="h-4 w-4" />
            Frequently Asked Questions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {FAQ.map((item) => (
            <div key={item.q}>
              <p className="text-sm font-semibold mb-1">{item.q}</p>
              <p className="text-sm text-muted-foreground">{item.a}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardContent className="pt-5 pb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Still need help?</p>
            <p className="text-xs text-muted-foreground">Our support team typically responds within 24 hours.</p>
          </div>
          <a
            href="mailto:support@prospector.app"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Contact Support
          </a>
        </CardContent>
      </Card>
    </div>
  )
}
