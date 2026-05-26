import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'outreach@yourdomain.com'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

function buildHtmlEmail(params: {
  body: string
  businessName: string
}): string {
  const { body, businessName } = params
  const bodyHtml = body
    .split('\n')
    .map((line) => (line.trim() === '' ? '<br/>' : `<p style="margin:0 0 12px 0">${line}</p>`))
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Email</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6; color: #1a1a1a; background: #f9f9f9; margin: 0; padding: 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f9f9f9; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb; overflow: hidden; max-width: 600px; width: 100%;">
          <tr>
            <td style="padding: 40px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px; border-top: 1px solid #e5e7eb; background: #f9f9f9;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
                This email was sent to ${businessName}.
                If you'd like to unsubscribe from future emails,
                <a href="${APP_URL}/unsubscribe" style="color: #6b7280;">click here</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function sendOutreachEmail(params: {
  to: string
  subject: string
  body: string
  businessName: string
}): Promise<{ id: string }> {
  const { to, subject, body, businessName } = params

  const html = buildHtmlEmail({ body, businessName })

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [to],
    subject,
    html,
    text: body,
    headers: {
      'List-Unsubscribe': `<${APP_URL}/unsubscribe>`,
    },
  })

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to send email via Resend')
  }

  return { id: data.id }
}
