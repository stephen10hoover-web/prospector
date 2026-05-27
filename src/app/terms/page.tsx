import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Terms of Service — Prospector' }

export default function TermsPage() {
  const updated = 'May 27, 2026'
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 prose prose-neutral dark:prose-invert">
      <h1>Terms of Service</h1>
      <p><em>Last updated: {updated}</em></p>

      <h2>1. Acceptance</h2>
      <p>By using Prospector you agree to these Terms. If you do not agree, do not use the platform.</p>

      <h2>2. Permitted Use</h2>
      <p>Prospector is a tool for identifying potential business clients and generating personalized outreach. You may use it only for lawful B2B prospecting activities.</p>

      <h2>3. Prohibited Use</h2>
      <p>You may not use Prospector to:</p>
      <ul>
        <li>Send spam, harassment, or deceptive emails</li>
        <li>Target individuals (consumer email addresses) — only business contacts</li>
        <li>Violate CAN-SPAM, CASL, GDPR, or any applicable email law</li>
        <li>Scrape or abuse the platform programmatically</li>
        <li>Resell access to the platform</li>
        <li>Attempt to reverse-engineer or circumvent security controls</li>
      </ul>

      <h2>4. Email Compliance</h2>
      <p>You are solely responsible for ensuring your outreach complies with all applicable laws including CAN-SPAM (US), CASL (Canada), and ePrivacy/GDPR (EU). Every email must include a functioning unsubscribe mechanism, which Prospector provides automatically. You must honor unsubscribe requests.</p>

      <h2>5. Account Termination</h2>
      <p>We may suspend or terminate your account immediately if you violate these Terms, abuse the platform, or engage in conduct that could harm other users or third parties.</p>

      <h2>6. Disclaimer of Warranties</h2>
      <p>Prospector is provided &quot;as is&quot; without warranties of any kind. We do not guarantee that lead data is accurate, complete, or up to date.</p>

      <h2>7. Limitation of Liability</h2>
      <p>To the maximum extent permitted by law, our liability to you for any claim arising from use of Prospector is limited to the amount you paid us in the 30 days prior to the claim.</p>

      <h2>8. Governing Law</h2>
      <p>These Terms are governed by the laws of the State of Texas, USA.</p>

      <h2>9. Contact</h2>
      <p>For legal questions: <strong>legal@prospector.app</strong></p>
    </div>
  )
}
