export const dynamic = 'force-dynamic'
import { NextRequest } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { recordOpenEvent } from '@/lib/email-tracking'

// 1×1 transparent GIF — smallest valid GIF (43 bytes)
const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const ua = request.headers.get('user-agent')

  // Record open in background — never block the pixel response
  waitUntil(recordOpenEvent(params.token, ua))

  return new Response(TRANSPARENT_GIF, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Content-Length': String(TRANSPARENT_GIF.length),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  })
}
