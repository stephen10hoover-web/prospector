import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Terms of Service — Prospector' }

export default function TermsPage() {
  const version = '1.1'
  const updated = 'May 28, 2026'
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 prose prose-neutral dark:prose-invert">
      <h1>Terms of Service</h1>
      <p><em>Version {version} · Last updated: {updated}</em></p>
      <p>
        Please read these Terms of Service (&quot;Terms&quot;) carefully before using Prospector. By creating
        an account or using the platform in any way, you agree to be bound by these Terms and our{' '}
        <a href="/privacy">Privacy Policy</a>. If you do not agree, you must not use Prospector.
      </p>

      <h2>1. Who We Are</h2>
      <p>
        Prospector (&quot;Prospector,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is a
        software-as-a-service platform operated by SiteForge Relations. References to
        &quot;you&quot; or &quot;User&quot; mean any individual or entity that accesses or uses the
        platform.
      </p>

      <h2>2. Eligibility and Account Registration</h2>
      <p>
        You must be at least 18 years old to use Prospector. By creating an account, you represent
        and warrant that: (a) you are at least 18 years old; (b) you have the legal capacity to
        enter into a binding contract; (c) you are not located in, organized under the laws of, or
        acting on behalf of any person in a country subject to US government embargo or sanctions
        (including but not limited to Cuba, Iran, North Korea, Syria, and the Crimea/Donetsk/Luhansk
        regions of Ukraine); and (d) all information you provide is accurate and current.
      </p>
      <p>
        You are responsible for maintaining the security of your account credentials. You must
        notify us immediately at <strong>support@prospector.app</strong> if you suspect unauthorized
        access to your account. We are not liable for losses arising from unauthorized account use.
      </p>

      <h2>3. Description of Service</h2>
      <p>
        Prospector is a B2B lead generation and outreach platform that allows users to discover
        local businesses, analyze their digital presence, and generate and send personalized outreach
        emails using AI assistance. The platform relies on third-party services including but not
        limited to Supabase, Vercel, Anthropic, SerpAPI, Resend, Stripe, and Hunter.io. We do not
        guarantee continuous availability of any feature that depends on a third-party service.
      </p>

      <h2>4. Acceptable Use</h2>
      <p>You may use Prospector only for lawful B2B prospecting activities. You agree not to:</p>
      <ul>
        <li>Send unsolicited commercial email (spam) to consumer addresses or any address where
          the recipient has not provided or implicitly consented to receive commercial communications
          from you</li>
        <li>Violate CAN-SPAM (US), CASL (Canada), ePrivacy Directive, GDPR, or any other applicable
          email marketing or data protection law</li>
        <li>Send email to addresses on suppression or do-not-contact lists</li>
        <li>Use deceptive, misleading, or false subject lines, sender names, or email content</li>
        <li>Impersonate any person, company, or entity</li>
        <li>Send content that is defamatory, harassing, threatening, obscene, or illegal</li>
        <li>Automate platform interactions through scripts, bots, or APIs except as explicitly
          authorized by us in writing</li>
        <li>Scrape, crawl, or systematically extract data from the platform</li>
        <li>Attempt to reverse-engineer, decompile, or circumvent platform security controls</li>
        <li>Resell, sublicense, or provide access to the platform to third parties without our
          written consent</li>
        <li>Use the platform in any manner that could damage, disable, or impair our infrastructure
          or interfere with other users</li>
        <li>Upload or transmit malware, viruses, or other harmful code</li>
        <li>Use the platform to facilitate export control violations or transact with
          OFAC-sanctioned persons or territories</li>
      </ul>

      <h2>5. Email Compliance — Your Sole Responsibility</h2>
      <p>
        <strong>You bear full legal responsibility for every email sent through your Prospector
        account.</strong> Prospector provides tools to assist with compliance but does not
        guarantee that your emails comply with any applicable law. Your obligations include:
      </p>
      <ul>
        <li>
          <strong>CAN-SPAM:</strong> Every commercial email must include your accurate physical
          mailing address, an honest subject line that reflects the email content, clear
          identification that the message is an advertisement, and a functioning unsubscribe
          mechanism. Prospector provides an unsubscribe link automatically. You must provide your
          accurate name, company name, and mailing address in your Sender Profile settings; you
          are solely responsible for the accuracy and legal sufficiency of that information.
        </li>
        <li>
          <strong>CASL (Canada):</strong> Canada&apos;s Anti-Spam Legislation requires express or
          implied consent before sending commercial electronic messages to Canadian recipients.
          Unlike CAN-SPAM, CASL is opt-in, not opt-out. You must obtain appropriate consent before
          emailing Canadian addresses.
        </li>
        <li>
          <strong>GDPR / ePrivacy (EU/UK):</strong> Sending unsolicited commercial email to business
          contacts in the EU or UK may require a legitimate interest assessment and must comply with
          applicable national implementations of the ePrivacy Directive. You are responsible for
          ensuring your outreach complies with applicable EU and UK law.
        </li>
        <li>
          <strong>Suppression lists:</strong> You must honor unsubscribe requests. Prospector
          maintains per-account suppression lists. You may not circumvent or override suppression
          to re-contact opted-out recipients.
        </li>
        <li>
          <strong>Content accuracy:</strong> You must review all AI-generated content before
          sending. You may not send content you know to be false or that makes representations
          you cannot substantiate.
        </li>
      </ul>
      <p>
        We reserve the right to suspend or terminate accounts that generate disproportionate spam
        complaints, bounce rates, or regulatory inquiries, in our sole discretion.
      </p>

      <h2>6. AI-Generated Content</h2>
      <p>
        Prospector uses third-party AI services (currently Anthropic&apos;s Claude) to generate
        outreach email drafts. You acknowledge and agree that:
      </p>
      <ul>
        <li>AI-generated content may be inaccurate, incomplete, biased, or inappropriate for your
          use case</li>
        <li>You must review and edit all AI-generated content before sending</li>
        <li>Prospector makes no warranty regarding the accuracy, fitness, or legality of
          AI-generated content</li>
        <li>You are solely responsible for all content sent from your account, regardless of
          whether it was AI-generated</li>
        <li>AI-generated content may inadvertently reproduce copyrighted material; you are
          responsible for ensuring your outreach does not infringe third-party intellectual
          property rights</li>
        <li>We may change, replace, or discontinue the AI services we use at any time without
          notice</li>
      </ul>

      <h2>7. Intellectual Property</h2>
      <p>
        <strong>Our IP:</strong> Prospector, including its software, design, trademarks, and
        documentation, is owned by SiteForge Relations and protected by intellectual property laws.
        You receive a limited, non-exclusive, non-transferable license to use the platform for
        your internal business purposes during your subscription.
      </p>
      <p>
        <strong>Your content:</strong> You retain ownership of content you provide as inputs
        (business names, search queries, personal information). You grant us a limited license to
        process your content solely to provide the service. We do not claim ownership of content
        you create using the platform.
      </p>
      <p>
        <strong>AI outputs:</strong> Email drafts generated by the platform are provided for your
        use. Copyright in AI-generated text is a developing area of law; you should not assume
        copyright protection in AI-generated content without legal advice.
      </p>

      <h2>8. DMCA / Copyright</h2>
      <p>
        We respect intellectual property rights. If you believe content on or generated through
        Prospector infringes your copyright, please send a DMCA notice to{' '}
        <strong>dmca@prospector.app</strong> including: (a) identification of the copyrighted
        work; (b) identification of the infringing material and its location; (c) your contact
        information; (d) a statement of good faith belief; (e) a statement of accuracy under
        penalty of perjury; and (f) your signature. We will process valid notices and, where
        appropriate, remove infringing content and terminate repeat infringers&apos; accounts.
      </p>

      <h2>9. Subscription, Billing, and Payment</h2>
      <p>
        <strong>Subscription terms:</strong> Paid subscriptions are billed on a monthly recurring
        basis starting from the date of purchase. All prices are in US dollars unless stated
        otherwise.
      </p>
      <p>
        <strong>Auto-renewal:</strong> YOUR SUBSCRIPTION WILL AUTOMATICALLY RENEW EACH MONTH
        UNLESS YOU CANCEL BEFORE THE END OF YOUR CURRENT BILLING PERIOD. You authorize us to
        charge your payment method on file for each renewal period.
      </p>
      <p>
        <strong>Price changes:</strong> We may change subscription pricing at any time. We will
        provide at least 30 days&apos; notice of price changes via email to your registered address.
        Continued use after the effective date constitutes acceptance of the new pricing.
      </p>
      <p>
        <strong>Cancellation:</strong> You may cancel your subscription at any time through your
        account settings or by contacting us. Cancellation takes effect at the end of the current
        billing period.
      </p>
      <p>
        <strong>Refunds:</strong> All subscription fees are non-refundable except where required by
        applicable law. We do not provide pro-rated refunds for partial months. If you believe you
        were charged in error, contact us at <strong>billing@prospector.app</strong> within 30 days
        of the charge.
      </p>
      <p>
        <strong>Payment processing:</strong> Payments are processed by Stripe. Your payment
        information is governed by Stripe&apos;s terms and privacy policy. We do not store
        full payment card numbers.
      </p>
      <p>
        <strong>Failed payments:</strong> If a payment fails, we may suspend your account until
        payment is resolved. After 14 days of non-payment, we may downgrade or terminate
        your subscription.
      </p>

      <h2>10. Service Availability</h2>
      <p>
        We provide Prospector &quot;as available.&quot; We do not guarantee any specific uptime,
        availability, or performance level. We are not liable for service interruptions caused by
        third-party infrastructure failures (including Supabase, Vercel, Anthropic, SerpAPI,
        Resend, or Stripe), scheduled maintenance, or events outside our reasonable control.
        We will make reasonable efforts to restore service promptly following any outage.
      </p>

      <h2>11. Modifications to the Service</h2>
      <p>
        We reserve the right to modify, suspend, or discontinue any part of the platform at any
        time, with or without notice. We are not liable to you or any third party for any
        modification, suspension, or discontinuation of service. Features marked as &quot;Beta&quot;
        are experimental, provided without warranty, and may be changed or removed at any time.
      </p>

      <h2>12. Modifications to These Terms</h2>
      <p>
        We may update these Terms at any time. If we make material changes, we will provide at
        least 14 days&apos; notice via email to your registered address before the changes take
        effect. Your continued use of the platform after the effective date constitutes acceptance
        of the updated Terms. If you do not agree to the updated Terms, you must stop using the
        platform and cancel your subscription before the effective date.
      </p>

      <h2>13. Privacy and Data Processing</h2>
      <p>
        Your use of Prospector is subject to our <a href="/privacy">Privacy Policy</a>, which is
        incorporated into these Terms by reference. By using the platform, you consent to our data
        practices as described in the Privacy Policy.
      </p>

      <h2>14. Third-Party Services</h2>
      <p>
        Prospector integrates with third-party services. Your use of those services is subject to
        their respective terms and privacy policies. We are not responsible for the acts or
        omissions of third-party providers, and outages or changes in third-party services may
        affect platform functionality without creating liability on our part.
      </p>

      <h2>15. User Representations and Warranties</h2>
      <p>You represent and warrant that:</p>
      <ul>
        <li>All information you provide to us is accurate, current, and complete</li>
        <li>Your use of the platform does not violate any applicable law or regulation</li>
        <li>You have all necessary rights and permissions to send email to any address you contact
          through the platform</li>
        <li>The mailing address you provide in your Sender Profile is a valid physical address
          associated with you or your business</li>
        <li>You are not acting on behalf of a competitor of Prospector for the purpose of
          accessing or evaluating our platform</li>
      </ul>

      <h2>16. Indemnification</h2>
      <p>
        You agree to defend, indemnify, and hold harmless SiteForge Relations and its officers,
        directors, employees, contractors, and agents from and against any claims, damages,
        losses, liabilities, costs, and expenses (including reasonable attorneys&apos; fees) arising
        out of or related to: (a) your use of or access to the platform; (b) any email content
        you generate, send, or cause to be sent through the platform; (c) your violation of these
        Terms; (d) your violation of any applicable law, regulation, or third-party right;
        (e) any false or inaccurate information you provide; or (f) any claim by a third party
        that you caused them harm through your use of the platform.
      </p>

      <h2>17. Disclaimer of Warranties</h2>
      <p>
        THE PLATFORM IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES
        OF ANY KIND, EXPRESS OR IMPLIED. TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, WE
        DISCLAIM ALL WARRANTIES INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
        PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT: (A) THE PLATFORM WILL
        BE UNINTERRUPTED OR ERROR-FREE; (B) LEAD DATA WILL BE ACCURATE, COMPLETE, OR UP TO DATE;
        (C) AI-GENERATED CONTENT WILL BE ACCURATE OR SUITABLE FOR YOUR PURPOSE; OR (D) THE
        PLATFORM WILL MEET YOUR SPECIFIC REQUIREMENTS.
      </p>

      <h2>18. Limitation of Liability</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL SITEFORGE RELATIONS
        OR ITS OFFICERS, DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
        SPECIAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES, INCLUDING LOST PROFITS, LOST DATA,
        OR LOSS OF GOODWILL, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE PLATFORM.
      </p>
      <p>
        OUR TOTAL CUMULATIVE LIABILITY TO YOU FOR ALL CLAIMS ARISING FROM OR RELATED TO THE
        PLATFORM SHALL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID US IN THE 12 MONTHS
        PRECEDING THE CLAIM OR (B) ONE HUNDRED US DOLLARS ($100).
      </p>
      <p>
        SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OR LIMITATION OF CERTAIN WARRANTIES OR
        LIABILITY, SO THE ABOVE LIMITATIONS MAY NOT APPLY TO YOU IN FULL.
      </p>

      <h2>19. Account Termination</h2>
      <p>
        <strong>By you:</strong> You may close your account at any time by contacting us at{' '}
        <strong>support@prospector.app</strong>. Subscription fees already paid are non-refundable.
      </p>
      <p>
        <strong>By us:</strong> We may suspend or terminate your account immediately, without
        prior notice or liability, if: (a) you violate these Terms; (b) we determine in our
        sole discretion that your use poses legal, regulatory, or reputational risk to us or
        third parties; (c) we receive a significant volume of spam complaints or abuse reports
        associated with your account; (d) you fail to pay fees when due; or (e) we are required
        to do so by law or regulatory authority.
      </p>
      <p>
        <strong>Effect of termination:</strong> Upon termination, your right to use the platform
        ceases immediately. We may retain your data as described in our Privacy Policy or as
        required by law. Sections 5, 6, 7, 15, 16, 17, 18, 20, 21, 22, and 23 survive
        termination.
      </p>

      <h2>20. Force Majeure</h2>
      <p>
        We are not liable for any failure or delay in performance resulting from causes beyond
        our reasonable control, including acts of God, natural disasters, war, terrorism, riots,
        government actions, third-party infrastructure failures, internet outages, pandemics,
        or other events of force majeure.
      </p>

      <h2>21. Dispute Resolution — Arbitration and Class Action Waiver</h2>
      <p>
        <strong>PLEASE READ THIS SECTION CAREFULLY. IT AFFECTS YOUR LEGAL RIGHTS.</strong>
      </p>
      <p>
        <strong>Informal resolution:</strong> Before filing any formal dispute, you agree to
        contact us at <strong>legal@prospector.app</strong> and give us 30 days to attempt
        informal resolution.
      </p>
      <p>
        <strong>Binding arbitration:</strong> If informal resolution fails, any dispute, claim,
        or controversy arising out of or relating to these Terms or the platform shall be resolved
        by binding individual arbitration administered by the American Arbitration Association
        (AAA) under its Consumer Arbitration Rules (for individuals) or Commercial Arbitration
        Rules (for businesses). Arbitration will be conducted in English. The arbitrator&apos;s
        decision is final and binding and may be entered as a judgment in any court of competent
        jurisdiction.
      </p>
      <p>
        <strong>CLASS ACTION WAIVER: YOU AND PROSPECTOR EACH AGREE THAT ANY DISPUTE RESOLUTION
        PROCEEDING WILL BE CONDUCTED ONLY ON AN INDIVIDUAL BASIS AND NOT IN A CLASS, CONSOLIDATED,
        OR REPRESENTATIVE ACTION. IF FOR ANY REASON A CLAIM PROCEEDS IN COURT RATHER THAN
        ARBITRATION, YOU AND PROSPECTOR EACH WAIVE ANY RIGHT TO A JURY TRIAL.</strong>
      </p>
      <p>
        <strong>Exceptions:</strong> Either party may seek emergency injunctive relief in a court
        of competent jurisdiction to prevent irreparable harm. Claims for intellectual property
        infringement may be brought in court.
      </p>
      <p>
        <strong>Opt-out:</strong> You may opt out of arbitration by sending written notice to{' '}
        <strong>legal@prospector.app</strong> within 30 days of first accepting these Terms.
        Opting out does not affect any other provision of these Terms.
      </p>

      <h2>22. Governing Law and Venue</h2>
      <p>
        These Terms are governed by the laws of the State of Texas, USA, without regard to its
        conflict of law provisions. For any dispute not subject to arbitration, you consent to
        the exclusive personal jurisdiction and venue of the state and federal courts located in
        Travis County, Texas.
      </p>

      <h2>23. General Provisions</h2>
      <ul>
        <li><strong>Entire agreement:</strong> These Terms and the Privacy Policy constitute the
          entire agreement between you and Prospector regarding the platform and supersede all
          prior agreements.</li>
        <li><strong>Severability:</strong> If any provision is found unenforceable, the remaining
          provisions continue in full force.</li>
        <li><strong>Waiver:</strong> Our failure to enforce any provision is not a waiver of our
          right to enforce it in the future.</li>
        <li><strong>Assignment:</strong> You may not assign these Terms without our written
          consent. We may assign these Terms in connection with a merger, acquisition, or sale
          of assets.</li>
        <li><strong>No agency:</strong> Nothing in these Terms creates a partnership, joint
          venture, agency, or employment relationship between you and Prospector.</li>
        <li><strong>Notices:</strong> Legal notices to us must be sent to{' '}
          <strong>legal@prospector.app</strong>. We will send notices to your registered email
          address.</li>
      </ul>

      <h2>24. Contact</h2>
      <ul>
        <li>General: <strong>support@prospector.app</strong></li>
        <li>Legal: <strong>legal@prospector.app</strong></li>
        <li>Billing: <strong>billing@prospector.app</strong></li>
        <li>Privacy / DMCA: <strong>privacy@prospector.app</strong></li>
      </ul>
    </div>
  )
}
