import { NextRequest, NextResponse } from 'next/server'
import { createServerClient as createSSRClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'

// Password must be 12+ chars and contain at least one number and one letter
const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d).{12,}$/

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 })
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'A password is required.' }, { status: 400 })
    }

    if (!PASSWORD_REGEX.test(password)) {
      return NextResponse.json(
        { error: 'Password must be at least 12 characters and contain at least one letter and one number.' },
        { status: 400 }
      )
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

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/api/auth/callback`,
      },
    })

    if (error) {
      const msg =
        error.message.toLowerCase().includes('already registered')
          ? 'An account with this email already exists.'
          : 'Sign up failed. Please try again.'
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
  }
}
