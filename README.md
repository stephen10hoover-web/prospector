# Prospector — AI-Powered Local Business Lead Generation

Find high-opportunity local businesses, score them with AI, and send personalized outreach — all in one platform.

## Tech Stack

- **Next.js 14** (App Router, Server Components)
- **TypeScript** + **TailwindCSS** + **ShadCN UI**
- **Supabase** (Auth + PostgreSQL with RLS)
- **Claude API** (`claude-sonnet-4-6`) for outreach generation and lead qualification
- **Resend** for email delivery
- **SerpAPI** for Google Maps business discovery
- **Hunter.io** for email address discovery
- **Stripe** for subscription billing

---

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/stephen10hoover-web/prospector
cd prospector
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Required | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase → Settings → API |
| `ANTHROPIC_API_KEY` | Yes | console.anthropic.com |
| `RESEND_API_KEY` | Yes | resend.com/api-keys |
| `RESEND_FROM_EMAIL` | Yes | A verified Resend sender address |
| `SERP_API_KEY` | No | serpapi.com — mock data used without it |
| `HUNTER_API_KEY` | No | hunter.io — email discovery disabled without it |
| `STRIPE_SECRET_KEY` | No | dashboard.stripe.com — billing disabled without it |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe webhook endpoint secret |
| `STRIPE_PRO_PRICE_ID` | No | Stripe product price ID for Pro plan |
| `NEXT_PUBLIC_APP_URL` | Yes | `http://localhost:3000` for local dev |

### 3. Run database migrations

In Supabase dashboard → SQL Editor, run each migration in order:

```
supabase/migrations/001_initial.sql
supabase/migrations/002_improvements.sql
supabase/migrations/003_billing.sql
```

Or with the Supabase CLI:

```bash
supabase db push
```

### 4. Set up Stripe (optional)

1. Create a product in Stripe dashboard — name it "Prospector Pro"
2. Add a recurring price ($29/month) and copy the Price ID → `STRIPE_PRO_PRICE_ID`
3. Create a webhook endpoint: `https://yourdomain.com/api/billing/webhook`
4. Subscribe to: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
5. Copy the signing secret → `STRIPE_WEBHOOK_SECRET`

For local webhook testing:
```bash
stripe listen --forward-to localhost:3000/api/billing/webhook
```

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Features

### Lead Discovery
- Search any business category + location
- Powered by SerpAPI (Google Maps)
- Falls back to realistic mock data without `SERP_API_KEY`
- Background processing — search returns immediately, results stream in

### Email Discovery
- Automatically finds business contact emails via Hunter.io
- Confidence score stored per email
- Skipped gracefully if Hunter.io is not configured

### AI Lead Scoring
- Deterministic scoring (website quality, reviews, ratings, category)
- Claude-powered qualification for reasoning
- Franchise detection caps score at 5

### Website Analysis
- SSL, mobile-friendliness, contact form detection
- Framework detection (WordPress, Wix, Squarespace, etc.)
- Issues list for use in sales pitches

### AI Outreach
- Personalized cold emails via `claude-sonnet-4-6`
- Prompt caching for efficiency
- Editable before sending
- Talking points for sales calls

### Email Delivery
- HTML email via Resend
- Unsubscribe footer
- Full outreach history per lead
- Status tracking: not_contacted → sent → replied → interested/closed

### Billing
- Free tier: 5 searches/month, 20 emails/month
- Pro ($29/month): unlimited searches and emails
- Stripe Checkout + Billing Portal
- Webhook-driven subscription state

---

## Deployment (Vercel)

1. Push to GitHub
2. Import project in Vercel
3. Set all environment variables in Vercel dashboard
4. Set `NEXT_PUBLIC_APP_URL` to your production domain
5. Register Stripe webhook pointing to `https://yourdomain.com/api/billing/webhook`

---

## Troubleshooting

**Search times out in production**
Vercel Hobby has a 10s function limit. Upgrade to Vercel Pro (60s) or reduce the SerpAPI result count.

**Emails not sending**
Verify `RESEND_FROM_EMAIL` is a verified sender in Resend. Check that the recipient address is valid.

**Stripe webhooks not firing**
Confirm `STRIPE_WEBHOOK_SECRET` matches the endpoint secret in Stripe dashboard. Use `stripe listen` for local testing.

**Hunter.io not finding emails**
Hunter.io requires a website URL. Businesses without websites will not have emails discovered.
