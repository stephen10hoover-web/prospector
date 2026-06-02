import { NextRequest, NextResponse } from 'next/server'
import { createServerClient as createSSRClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 })
    }

    const reqHeaders = await headers()
    const origin = reqHeaders.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? ''

    const cookieStore = await cookies()
    const supabase = createSSRClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
          set(name: string, value: string, options: Record<string, unknown>) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: Record<string, unknown>) {
            cookieStore.delete({ name, ...options })
          },
        },
      }
    )

    // Always return success to avoid leaking whether the email is registered
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset-password`,
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
  }
}
