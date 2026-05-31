import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Privacy Policy — Prospector' }

export default function PrivacyPage() {
  const version = '1.1'
  const updated = 'May 28, 2026'
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 prose prose-neutral dark:prose-invert">
      <h1>Privacy Policy</h1>
      <p><em>Version {version} · Last updated: {updated}</em></p>

      <h2>1. Who We Are and How to Contact Us</h2>
      <p>
        Prospector is operated by SiteForge Relations (&quot;we,&quot; &quot;us,&quot;
        &quot;our&quot;). We are the data controller for personal data collected through
        this platform.
      </p>
      <p>
        <strong>Contact:</strong> privacy@prospector.app<br />
        <strong>Mailing address:</strong> privacy@prospectorsearches.com
      </p>
      <p>
        This Policy explains how we collect, use, store, and share personal data when you use
        Prospector, and explains your rights regarding that data. It covers data we collect
        about our registered users (&quot;Users&quot;) as well as data Users cause to be processed
        through the platform (e.g., business contact information used for outreach).
      </p>

      <h2>2. Minimum Age</h2>
      <p>
        Prospector is intended for users who are at least 18 years old. We do not knowingly
        collect personal data from anyone under 18. If we learn we have collected data from a
        minor, we will delete it promptly. If you believe a minor has created an account, contact
        us at <strong>privacy@prospector.app</strong>.
      </p>

      <h2>3. What Data We Collect and Why</h2>

      <h3>3.1 Account Data</h3>
      <p>
        When you register, we collect your email address and a securely hashed password (we
        never store your plaintext password). We use this to authenticate you and communicate
        with you about your account.
      </p>
      <p><em>Lawful basis (GDPR):</em> Performance of a contract (Article 6(1)(b)).</p>

      <h3>3.2 Sender Profile Data</h3>
      <p>
        If you provide your name, company name, and mailing address in your Sender Profile
        settings, we store and use that information to populate the footer of outreach emails
        you send through the platform, as required by CAN-SPAM law. You are responsible for
        the accuracy of this information.
      </p>
      <p><em>Lawful basis (GDPR):</em> Performance of a contract; legal obligation.</p>

      <h3>3.3 Lead and Business Data</h3>
      <p>
        When you run a search, the platform retrieves publicly available business information
        — including business name, address, phone number, website URL, and review data — from
        Google Maps via SerpAPI. This data is stored in your account and is used solely to
        provide you with lead data. We do not independently source, sell, or share this data.
      </p>
      <p><em>Lawful basis (GDPR):</em> Legitimate interests (providing contracted services).</p>

      <h3>3.4 Outreach Email Data</h3>
      <p>
        When you send an outreach email through Prospector, we store: the recipient email address,
        subject line, email body, timestamp, and delivery status. This data is retained in your
        account to provide you with a history of your outreach activity.
      </p>
      <p><em>Lawful basis (GDPR):</em> Performance of a contract.</p>

      <h3>3.5 Email Open Tracking</h3>
      <p>
        Outreach emails sent through Prospector may include a single-pixel tracking image
        (&quot;tracking pixel&quot;). When the recipient opens the email, the pixel load records:
        the approximate time of opening, the recipient&apos;s IP address (which may indicate
        approximate location), and device/email client information. This data is attributed to
        your account and displayed in your outreach dashboard.
      </p>
      <p>
        <strong>Recipient notice:</strong> We encourage Users to disclose tracking to recipients.
        Prospector does not itself provide disclosure to email recipients; this is the
        User&apos;s responsibility under applicable law.
      </p>
      <p><em>Lawful basis (GDPR):</em> Legitimate interests of the User (outreach performance
        measurement); Users are responsible for their own lawful basis for processing recipient
        data.</p>

      <h3>3.6 Usage and Billing Data</h3>
      <p>
        We track your monthly usage (number of searches, emails generated, emails sent) for
        plan enforcement and billing purposes. Payment processing is handled by Stripe; we
        do not store full payment card numbers. We retain billing records as required by law.
      </p>
      <p><em>Lawful basis (GDPR):</em> Performance of a contract; legal obligation.</p>

      <h3>3.7 Cookies and Similar Technologies</h3>
      <p>We use the following types of cookies and local storage:</p>
      <ul>
        <li>
          <strong>Essential / Authentication cookies:</strong> Set by Supabase to maintain your
          login session. These are strictly necessary and cannot be disabled without breaking
          the platform. Lawful basis: legitimate interests / necessity.
        </li>
        <li>
          <strong>Preference storage:</strong> We use your browser&apos;s localStorage to remember
          your cookie consent choice and UI preferences (e.g., color theme). This does not
          involve cross-site tracking.
        </li>
        <li>
          <strong>Analytics:</strong> We may use analytics tools to understand platform usage
          patterns (page views, feature usage). These are only activated after you consent via
          the cookie consent banner. If you decline, no analytics data is collected.
        </li>
      </ul>
      <p>
        You can withdraw cookie consent at any time by clearing your browser storage. Essential
        cookies cannot be disabled without impairing platform functionality.
      </p>

      <h3>3.8 Log and Technical Data</h3>
      <p>
        Our servers and infrastructure providers automatically collect technical data including
        IP addresses, browser type, referring URLs, and request timestamps. This data is used
        for security monitoring, abuse prevention, and platform diagnostics.
      </p>
      <p><em>Lawful basis (GDPR):</em> Legitimate interests (security and abuse prevention).</p>

      <h3>3.9 Consent Records</h3>
      <p>
        When you create an account, we record a timestamp and technical identifiers confirming
        your acceptance of our Terms of Service and Privacy Policy. This record is retained
        for the lifetime of your account and for 7 years after closure, as evidence of consent.
      </p>

      <h2>4. How We Use Your Data</h2>
      <ul>
        <li>To create and maintain your account</li>
        <li>To provide the lead discovery, AI generation, and email sending features</li>
        <li>To enforce usage limits and prevent abuse</li>
        <li>To process payments and manage subscriptions via Stripe</li>
        <li>To send transactional emails (account confirmation, billing receipts, password resets)</li>
        <li>To respond to support requests</li>
        <li>To monitor and improve platform security</li>
        <li>To analyze aggregate, anonymized usage patterns to improve the platform</li>
        <li>To comply with legal obligations</li>
      </ul>
      <p>
        <strong>We do not sell your personal data to third parties.</strong> We do not use your
        data to train AI models. We do not use your outreach email content for any purpose other
        than providing the service.
      </p>

      <h2>5. AI Processing</h2>
      <p>
        When you use the AI email generation feature, data you provide (business name, website
        information, and your account context) is sent to Anthropic&apos;s Claude API to generate
        email drafts. This data is processed by Anthropic in accordance with their privacy policy
        and data processing agreement. We do not use your inputs to train Anthropic&apos;s models.
        Please do not include sensitive personal data in your AI generation prompts.
      </p>

      <h2>6. Third-Party Service Providers (Subprocessors)</h2>
      <p>
        We share data with the following categories of service providers who process data on
        our behalf:
      </p>
      <ul>
        <li><strong>Supabase</strong> — database hosting and user authentication</li>
        <li><strong>Vercel</strong> — application hosting and infrastructure</li>
        <li><strong>Anthropic</strong> — AI model API for email generation</li>
        <li><strong>Resend</strong> — transactional and outreach email delivery</li>
        <li><strong>SerpAPI</strong> — business discovery data from Google Maps</li>
        <li><strong>Stripe</strong> — payment processing and subscription management</li>
        <li><strong>Hunter.io</strong> (Pro plan) — email address discovery</li>
        <li><strong>Sentry</strong> (optional) — error monitoring and crash reporting</li>
      </ul>
      <p>
        Each provider is bound by data processing agreements and/or standard contractual clauses
        where applicable. We only share data necessary for each provider to perform their
        contracted function.
      </p>

      <h2>7. International Data Transfers</h2>
      <p>
        Prospector is operated from the United States. Our service providers (Supabase, Vercel,
        Anthropic, Resend, Stripe) are US-based. If you access the platform from the European
        Economic Area (EEA), United Kingdom, or other jurisdictions with data transfer
        restrictions, your data will be transferred to the US.
      </p>
      <p>
        We rely on the following mechanisms for international transfers:
      </p>
      <ul>
        <li>Standard Contractual Clauses (SCCs) approved by the European Commission, where
          required by our subprocessor agreements</li>
        <li>The EU-US Data Privacy Framework (where applicable providers are certified)</li>
      </ul>
      <p>
        By using Prospector, you acknowledge that your data may be transferred to and processed
        in the United States, which may have different data protection standards than your
        home jurisdiction.
      </p>

      <h2>8. Data Retention</h2>
      <ul>
        <li><strong>Account data:</strong> Retained for the duration of your account plus 90 days
          after closure, after which it is deleted or anonymized.</li>
        <li><strong>Lead and outreach data:</strong> Retained for the duration of your account.
          Deleted within 90 days of account closure unless retention is required by law.</li>
        <li><strong>Billing records:</strong> Retained for 7 years as required by tax and
          accounting law.</li>
        <li><strong>Consent records:</strong> Retained for 7 years as evidence of agreement.</li>
        <li><strong>Server logs:</strong> Retained for 90 days, then deleted.</li>
        <li><strong>Email suppression list:</strong> Retained indefinitely to honor
          unsubscribe requests.</li>
      </ul>

      <h2>9. Your Privacy Rights</h2>
      <p>
        Depending on your location, you may have the following rights regarding your personal data.
        To exercise any right, email <strong>privacy@prospector.app</strong> from your registered
        address. We will respond within 30 days (or within the timeframe required by applicable
        law).
      </p>

      <h3>9.1 Rights for All Users</h3>
      <ul>
        <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
        <li><strong>Correction:</strong> Request correction of inaccurate data.</li>
        <li><strong>Deletion:</strong> Request deletion of your account and personal data, subject
          to retention obligations (billing records, legal holds).</li>
        <li><strong>Objection:</strong> Object to processing based on legitimate interests.</li>
      </ul>

      <h3>9.2 Additional Rights for EEA / UK Users (GDPR / UK GDPR)</h3>
      <ul>
        <li><strong>Portability:</strong> Request your data in a structured, machine-readable
          format.</li>
        <li><strong>Restriction:</strong> Request that we restrict processing of your data in
          certain circumstances.</li>
        <li><strong>Supervisory authority:</strong> You have the right to lodge a complaint with
          your national data protection authority (e.g., ICO in the UK, CNIL in France).</li>
      </ul>

      <h3>9.3 Additional Rights for California Users (CCPA / CPRA)</h3>
      <p>
        California residents have additional rights under the California Consumer Privacy Act
        (CCPA) as amended by the CPRA:
      </p>
      <ul>
        <li><strong>Know:</strong> Right to know what personal information we collect and how
          we use it (this Policy fulfills that requirement).</li>
        <li><strong>Delete:</strong> Right to request deletion of your personal information.</li>
        <li><strong>Correct:</strong> Right to request correction of inaccurate personal
          information.</li>
        <li><strong>Opt out of sale/sharing:</strong> We do not sell or share personal information
          for cross-context behavioral advertising within the meaning of the CCPA. No
          opt-out is required.</li>
        <li><strong>Non-discrimination:</strong> We will not discriminate against you for
          exercising your CCPA rights.</li>
      </ul>
      <p>
        To exercise California rights, contact us at <strong>privacy@prospector.app</strong>.
        You may also designate an authorized agent to submit requests on your behalf.
      </p>

      <h2>10. Account Deletion</h2>
      <p>
        To delete your account and personal data, email <strong>privacy@prospector.app</strong>{' '}
        from your registered address with the subject line &quot;Account Deletion Request.&quot;
        We will confirm deletion within 30 days. Note that billing records and consent logs are
        retained as described in Section 8. Email addresses on the suppression list are retained
        to honor ongoing unsubscribe requests.
      </p>
      <p>
        <em>Note: A self-service deletion tool is on our product roadmap.</em>
      </p>

      <h2>11. Unsubscribe and Email Suppression</h2>
      <p>
        Every outreach email sent through Prospector includes an unsubscribe link. Clicking this
        link adds the recipient email address to a per-account suppression list. Once suppressed,
        that email address cannot receive further outreach from that Prospector account. Users
        are prohibited from circumventing suppression lists.
      </p>

      <h2>12. Security</h2>
      <p>
        We implement reasonable technical and organizational measures to protect your data,
        including:
      </p>
      <ul>
        <li>Encrypted connections (TLS) for all data in transit</li>
        <li>Row-level security (RLS) policies on our database so each user can only access
          their own data</li>
        <li>Hashed password storage (we never store plaintext passwords)</li>
        <li>Rate limiting and bot detection on API endpoints</li>
        <li>Access controls limiting employee access to production systems</li>
      </ul>
      <p>
        <strong>No system is 100% secure.</strong> We cannot guarantee the absolute security of
        your data. If you believe your account has been compromised, contact us immediately at{' '}
        <strong>security@prospector.app</strong>.
      </p>

      <h2>13. Data Breach Notification</h2>
      <p>
        In the event of a data breach that poses a risk to your rights and freedoms, we will
        notify affected users without undue delay and, where required by law, notify relevant
        supervisory authorities within 72 hours of becoming aware of the breach. Notification
        will be sent to your registered email address.
      </p>

      <h2>14. Links to Third-Party Sites</h2>
      <p>
        Our platform may contain links to third-party websites. We are not responsible for the
        privacy practices of those sites and encourage you to review their privacy policies.
      </p>

      <h2>15. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will notify you of material
        changes via email at least 14 days before they take effect. Your continued use of the
        platform after the effective date constitutes acceptance of the updated Policy.
      </p>

      <h2>16. Contact and Complaints</h2>
      <p>
        For privacy questions, data requests, or complaints:
        <br /><strong>Email:</strong> privacy@prospector.app
        <br /><strong>Mailing address:</strong> privacy@prospectorsearches.com
      </p>
      <p>
        EEA and UK users have the right to lodge a complaint with their national supervisory
        authority if they believe we have processed their data unlawfully.
      </p>
    </div>
  )
}
