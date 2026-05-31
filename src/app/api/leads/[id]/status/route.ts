export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { z } from 'zod'
import { isUUID } from '@/lib/validate'

const statusSchema = z.object({
  status: z.enum([
    'not_contacted',
    'generated',
    'sent',
    'replied',
    'interested',
    'closed',
    'not_interested',
  ]),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!isUUID(id)) {
      return NextResponse.json({ error: 'Invalid lead ID' }, { status: 400 })
    }

    const body = await request.json()
    const parsed = statusSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid status', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { data: updated, error } = await supabase
      .from('businesses')
      .update({ outreach_status: parsed.data.status })
      .eq('id', id)
      .eq('user_id', user!.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
    }

    if (!updated) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    return NextResponse.json({ business: updated })
  } catch (error) {
    console.error('Status update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
