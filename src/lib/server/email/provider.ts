import 'server-only'

export interface EmailMessage {
  to: string | string[]
  subject: string
  html: string
  text: string
  replyTo?: string
}

export interface EmailProvider {
  readonly name: string
  send(message: EmailMessage): Promise<{ id?: string }>
}

/** Resend (https://resend.com) via its HTTP API — no SDK needed. */
class ResendProvider implements EmailProvider {
  readonly name = 'resend'
  constructor(private apiKey: string, private from: string) {}

  async send(message: EmailMessage) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: this.from,
        to: Array.isArray(message.to) ? message.to : [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...(message.replyTo && { reply_to: message.replyTo }),
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`Resend responded ${res.status}: ${body.slice(0, 300)}`)
    }
    const data = (await res.json().catch(() => ({}))) as { id?: string }
    return { id: data.id }
  }
}

/** Development fallback: prints emails instead of sending them. */
class ConsoleProvider implements EmailProvider {
  readonly name = 'console'
  async send(message: EmailMessage) {
    console.info(`\n[email:console] To: ${[message.to].flat().join(', ')}\nSubject: ${message.subject}\n\n${message.text}\n`)
    return {}
  }
}

let cached: EmailProvider | null = null

export function getEmailProvider(): EmailProvider {
  if (cached) return cached
  const key = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM || 'InvoiceFlow <onboarding@resend.dev>'
  cached = key ? new ResendProvider(key, from) : new ConsoleProvider()
  return cached
}
