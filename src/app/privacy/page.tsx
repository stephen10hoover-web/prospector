import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Privacy Policy — Prospector' }

export default function PrivacyPage() {
  const updated = 'May 27, 2026'
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 prose prose-neutral dark:prose-invert">
      <h1>Privacy Policy</h1>
      <p><em>Last updated: {updated}</em></p>

      <h2>1. Who We Are</h2>
      <p>Prospector (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is a lead generation platform that helps freelancers and agencies identify local businesses for outreach. We are operated by SiteForge Relations.</p>

      <h2>2. Information We Collect</h2>
      <h3>Account Data</h3>
      <p>When you create an account we collect your email address and a hashed password.</p>
      <h3>Lead Data</h3>
      <p>When you run a search we collect publicly available business information including business name, address, phone number, website URL, and review data sourced from Google Maps via SerpAPI.</p>
      <h3>Usage Data</h3>
      <p>We track how many searches, email generations, and emails you send each month for billing and abuse prevention purposes.</p>
      <h3>Email Tracking</h3>
      <p>Emails sent through Prospector may include a tracking pixel that records when the email was opened. This data is stored and displayed in your dashboard.</p>

      <h2>3. How We Use Your Information</h2>
      <ul>
        <li>To provide and operate the Prospector platform</li>
        <li>To enforce usage limits and prevent abuse</li>
        <li>To process payments via Stripe</li>
        <li>To send transactional emails related to your account</li>
      </ul>
      <p>We do not sell your data to third parties.</p>

      <h2>4. Data Retention</h2>
      <p>Lead data is retained for as long as your account is active. You may delete individual leads or your entire account at any time by contacting us at the address below.</p>

      <h2>5. Third-Party Services</h2>
      <p>We use the following third-party services:</p>
      <ul>
        <li><strong>Supabase</strong> — database and authentication</li>
        <li><strong>Vercel</strong> — hosting and infrastructure</li>
        <li><strong>Resend</strong> — email delivery</li>
        <li><strong>Anthropic Claude</strong> — AI-generated email content</li>
        <li><strong>SerpAPI</strong> — business discovery data</li>
        <li><strong>Stripe</strong> — payment processing</li>
      </ul>

      <h2>6. Your Rights</h2>
      <p>You may request access to, correction of, or deletion of your personal data at any time by emailing us. We will respond within 30 days.</p>

      <h2>7. Cold Email Compliance</h2>
      <p>Emails sent through Prospector must comply with CAN-SPAM, CASL, and applicable local laws. Every email includes an unsubscribe link. Users are responsible for ensuring their outreach complies with applicable law.</p>

      <h2>8. Security</h2>
      <p>We implement industry-standard security measures including encrypted connections, row-level security on our database, and regular security reviews.</p>

      <h2>9. Contact</h2>
      <p>For privacy questions or data requests, contact us at: <strong>privacy@prospector.app</strong></p>
    </div>
  )
}
