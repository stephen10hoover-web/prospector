import { createAdminClient } from './supabase-server'

/** Fire outbound webhooks for a user + event (non-blocking, best-effort). */
export async function fireWebhooks(
  userId: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  const supabase = createAdminClient()

  const { data: hooks } = await supabase
    .from('outbound_webhooks')
    .select('id, url, secret')
    .eq('user_id', userId)
    .eq('active', true)
    .contains('events', [event])

  if (!hooks?.length) return

  const fullPayload = { ...payload, event, timestamp: new Date().toISOString() }
  const body = JSON.stringify(fullPayload)

  for (const hook of hooks) {
    deliverWebhook(hook.id, hook.url, hook.secret, event, fullPayload, body, supabase).catch(() => null)
  }
}

async function deliverWebhook(
  webhookId: string,
  url: string,
  secret: string | null,
  event: string,
  payload: Record<string, unknown>,
  body: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
): Promise<void> {
  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Prospector-Event': event,
  }

  if (secret) {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
    reqHeaders['X-Prospector-Signature'] = Buffer.from(sig).toString('hex')
  }

  let statusCode = 0
  let responseBody = ''

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: reqHeaders,
      body,
      signal: AbortSignal.timeout(10_000),
    })
    statusCode = res.status
    responseBody = (await res.text()).slice(0, 500)
  } catch (err) {
    responseBody = err instanceof Error ? err.message : String(err)
  }

  await supabase
    .from('webhook_deliveries')
    .insert({
      webhook_id: webhookId,
      event,
      payload,
      status_code: statusCode,
      response_body: responseBody,
      success: statusCode >= 200 && statusCode < 300,
    })
    .then(() => null)
    .catch(() => null)
}
