import { z } from 'zod'
import { route, parseJson, clientIp } from '@/lib/server/api'
import { enforceRateLimit } from '@/lib/server/rate-limit'
import { sendEmail } from '@/lib/server/email'
import { ApiError } from '@/lib/server/errors'

const schema = z.object({
  name: z.string().trim().min(2, 'Please enter your name').max(120),
  email: z.string().trim().toLowerCase().email('Please enter a valid email').max(200),
  company: z.string().trim().max(160).optional().transform((v) => v || null),
  topic: z.enum(['Sales', 'Support', 'Billing', 'Partnership', 'Other']),
  message: z.string().trim().min(10, 'Please write at least a few words').max(5000),
  // Honeypot: real users never fill this in.
  website: z.string().max(0).optional(),
})

export const POST = route(async (request) => {
  await enforceRateLimit(`contact:${clientIp(request)}`, 5, 60 * 60)
  const data = await parseJson(request, schema)
  const to = process.env.SUPPORT_EMAIL
  if (!to) throw new ApiError('SERVICE_UNAVAILABLE', 'Messaging is temporarily unavailable. Please email us directly.')
  await sendEmail(to, 'contactMessage', { name: data.name, email: data.email, company: data.company, topic: data.topic, message: data.message })
  return { sent: true }
})
