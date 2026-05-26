# Prospector — AI-Powered Local Business Lead Generation

Find high-opportunity local businesses, score them with AI, and send personalized outreach — all in one platform.

## Tech Stack

- **Next.js 14** (App Router, Server Components)
- **TypeScript** + **TailwindCSS** + **ShadCN UI**
- **Supabase** (Auth + PostgreSQL with RLS)
- **Claude API** (claude-sonnet-4-6) for outreach generation
- **Resend** for email delivery
- **SerpAPI** for Google Maps business discovery

---

## Quick Start

### 1. Clone and install dependencies

```bash
cd C:\Users\User\prospector
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in your keys:

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project → Settings → API |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) |
| `RESEND_API_KEY` | [resend.com/api-keys](https://resend.com/api-keys) |
| `RESEND_FROM_EMAIL` | A verified Resend sender email |
| `SERP_API_KEY` | [serpapi.com](https://serpapi.com) — optional, mock data used without it |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` for local dev |

### 3. Run the Supabase migration

In the Supabase dashboard, go to **SQL Editor** and run the contents of:

```
supabase/migrations/001_initial.sql
```

Or if you have the Supabase CLI:

```bash
supabase db push
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to the login page.

---

## Features

### Lead Discovery
- Search any business category + location
- Powered by SerpAPI Google Maps integration
- Falls back to realistic mock data when `SERP_API_KEY` is not set (great for dev)

### AI Lead Scoring
- Deterministic scoring based on website quality, review count, ratings, and business category
- High-ticket categories (roofing, med spas, contractors) get bonus points
- Franchise detection automatically reduces score

### Website Analysis
- Fetches and analyzes business websites server-side
- Detects: SSL, mobile-friendliness, contact forms, CMS/framework
- Issues list shows exactly what's wrong (your sales pitch)

### AI Outreach (Claude)
- Generates personalized cold emails using `claude-sonnet-4-6`
- Prompt caching on system prompt for efficiency
- Editable before sending
- Talking points extracted for sales calls

### Email Delivery (Resend)
- HTML email with clean template and unsubscribe footer
- Full outreach history log per lead
- Status tracking: not_contacted → generated → sent → replied → interested/closed

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login + Signup pages
│   ├── (dashboard)/     # Protected app pages
│   │   ├── dashboard/   # Stats overview
│   │   ├── search/      # Business discovery form
│   │   └── leads/       # Leads table + detail pages
│   └── api/             # REST API routes
├── components/
│   ├── layout/          # Sidebar
│   ├── leads/           # LeadsTable, LeadFilters, LeadStatusSelect
│   ├── search/          # SearchForm
│   ├── outreach/        # OutreachModal
│   └── ui/              # ShadCN components
├── lib/
│   ├── claude.ts        # Claude API integration
│   ├── resend.ts        # Email sending
│   ├── scoring.ts       # Lead scoring algorithm
│   ├── website-analyzer.ts  # Website quality analysis
│   ├── business-discovery.ts # SerpAPI integration
│   ├── supabase.ts      # Browser Supabase client
│   └── supabase-server.ts   # Server Supabase client (SSR)
└── types/
    └── index.ts         # All TypeScript types
```

---

## Development Notes

- The app works fully without `SERP_API_KEY` — mock data with 5 Austin businesses is used
- Without `ANTHROPIC_API_KEY`, outreach generation will fail with a 500 error
- Without `RESEND_API_KEY`, email sending will fail — but generation still works
- All Supabase tables have Row Level Security enabled — users only see their own data
