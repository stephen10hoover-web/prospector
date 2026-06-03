export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { sanitizeSubject } from '@/lib/sanitize'

const VALID_CATEGORIES = ['billing', 'bug', 'feature', 'general'] as const
type Category = typeof VALID_CATEGORIES[number]

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const body = await request.json().catch(() => ({}))
  const { subject, message, category = 'general', email: guestEmail } = body

  const userEmail = user?.email ?? guestEmail
  if (!userEmail) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

  const sanitizedSubject = sanitizeSubject(String(subject ?? '').trim())
  if (!sanitizedSubject) return NextResponse.json({ error: 'Subject is required' }, { status: 400 })
  if (sanitizedSubject.length > 200) return NextResponse.json({ error: 'Subject too long' }, { status: 400 })

  const messageStr = String(message ?? '').trim()
  if (!messageStr) return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  if (messageStr.length > 5000) return NextResponse.json({ error: 'Message too long (max 5000 chars)' }, { status: 400 })

  const validCategory: Category = VALID_CATEGORIES.includes(category as Category) ? category as Category : 'general'

  const admin = createAdminClient()
  const { error } = await admin.from('support_submissions').insert({
    user_id: user?.id ?? null,
    user_email: userEmail,
    subject: sanitizedSubject,
    body: messageStr,
    category: validCategory,
  })

  if (error) return NextResponse.json({ error: 'Failed to submit ticket' }, { status: 500 })
  return NextResponse.json({ success: true }, { status: 201 })
}

// GET: user reads their own tickets
export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('support_submissions')
    .select('id, subject, category, status, admin_reply, created_at, replied_at')
    .order('created_at', { ascending: false })

  return NextResponse.json({ tickets: data ?? [] })
}
