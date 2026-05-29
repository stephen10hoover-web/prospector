import { NextResponse } from 'next/server'
import { createServerClient as createSSRClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase-server'

function sanitizeUsername(email: string): string {
  const local = email.split('@')[0] ?? 'user'
  return (
    local
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, '.')
      .replace(/\.{2,}/g, '.')
      .replace(/^\.+|\.+$/g, '') || 'user'
  )
}

function getOutreachDomain(): string {
  const fromEmail = process.env.OUTREACH_EMAIL_DOMAIN ?? process.env.RESEND_FROM_EMAIL ?? ''
  // If OUTREACH_EMAIL_DOMAIN is a bare domain (no @), use it directly
  if (fromEmail && !fromEmail.includes('@')) return fromEmail
  // Otherwise extract the domain from the email address
  const atIdx = fromEmail.lastIndexOf('@')
  if (atIdx !== -1) return fromEmail.slice(atIdx + 1)
  return 'prospectorsearches.com'
}

async function provisionFreeTrial(userId: string): Promise<void> {
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) return

  await admin.from('subscriptions').insert({
    user_id: userId,
    plan: 'free_trial',
    status: 'trialing',
    trial_started_at: new Date().toISOString(),
  })
}

async function provisionSendingEmail(userId: string, userEmail: string): Promise<void> {
  const admin = createAdminClient()

  // Skip if user already has a profile with a sending email
  const { data: existing } = await admin
    .from('user_profiles')
    .select('sending_email')
    .eq('id', userId)
    .maybeSingle()

  if (existing?.sending_email) return

  const base = sanitizeUsername(userEmail)
  const domain = getOutreachDomain()

  // Find a unique username (base, base2, base3, ...)
  let username = base
  let attempt = 0
  while (true) {
    const candidate = attempt === 0 ? base : `${base}${attempt + 1}`
    const { data: taken } = await admin
      .from('user_profiles')
      .select('id')
      .eq('sending_email', `${candidate}@${domain}`)
      .maybeSingle()

    if (!taken) {
      username = candidate
      break
    }
    attempt++
    // Fallback: append first 8 chars of user UUID to guarantee uniqueness
    if (attempt > 99) {
      username = `${base}.${userId.slice(0, 8)}`
      break
    }
  }

  await admin.from('user_profiles').upsert(
    { id: userId, sending_email: `${username}@${domain}` },
    { onConflict: 'id' }
  )
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next') ?? '/dashboard'
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard'

  if (code) {
    const cookieStore = cookies()
    const supabase = createSSRClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: Record<string, unknown>) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: Record<string, unknown>) {
            cookieStore.delete({ name, ...options })
          },
        },
      }
    )

    const {
      data: { session },
      error,
    } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && session) {
      // Provision free trial + sending email non-blocking — failure must not break login
      provisionFreeTrial(session.user.id).catch((e) => {
        console.error('[auth] Failed to provision free trial:', e)
      })
      provisionSendingEmail(
        session.user.id,
        session.user.email ?? `${session.user.id}@unknown`
      ).catch((e) => {
        console.error('[auth] Failed to provision sending email:', e)
      })
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
