import { NextRequest, NextResponse } from 'next/server'
import { createServerClient as createSSRClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d).{12,}$/

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'A password is required.' }, { status: 400 })
    }

    if (!PASSWORD_REGEX.test(password)) {
      return NextResponse.json(
        { error: 'Password must be at least 12 characters and contain at least one letter and one number.' },
        { status: 400 }
      )
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

    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      return NextResponse.json({ error: 'Failed to update password. The reset link may have expired.' }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
  }
}
