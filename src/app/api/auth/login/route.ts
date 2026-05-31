import { NextRequest, NextResponse } from 'next/server'
import { createServerClient as createSSRClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
    }

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

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      // Normalise Supabase error — don't leak internal details
      const msg =
        error.message.toLowerCase().includes('invalid login') ||
        error.message.toLowerCase().includes('invalid credentials')
          ? 'Incorrect email or password.'
          : 'Sign in failed. Please try again.'
      return NextResponse.json({ error: msg }, { status: 401 })
    }

    if (!data.user?.email_confirmed_at) {
      await supabase.auth.signOut()
      return NextResponse.json(
        { error: 'Please verify your email before signing in. Check your inbox.' },
        { status: 403 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
  }
}
