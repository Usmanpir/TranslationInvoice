import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { route } from '@/lib/server/api'
import { requireOrganization, requirePermission } from '@/lib/server/context'
import { badRequest } from '@/lib/server/errors'
import { checkUsageLimit, requireFeature } from '@/lib/server/subscription'
import { enforceRateLimit } from '@/lib/server/rate-limit'

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB per file

// Only types whose content we verify by signature below. SVG is deliberately excluded (script risk).
const PURPOSES = {
  PAYMENT_PROOF: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'],
  LOGO: ['image/jpeg', 'image/png', 'image/webp'],
} as const

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
}

/** Checks magic bytes so a renamed executable can't pass as an image/PDF. */
function matchesSignature(mime: string, buf: Buffer) {
  const hex = buf.subarray(0, 12).toString('hex')
  switch (mime) {
    case 'image/jpeg':
      return hex.startsWith('ffd8ff')
    case 'image/png':
      return hex.startsWith('89504e470d0a1a0a')
    case 'image/gif':
      return hex.startsWith('474946383761') || hex.startsWith('474946383961')
    case 'image/webp':
      return hex.startsWith('52494646') && buf.subarray(8, 12).toString('ascii') === 'WEBP'
    case 'application/pdf':
      return buf.subarray(0, 5).toString('ascii') === '%PDF-'
    default:
      return false
  }
}

function sanitizeFilename(name: string) {
  const base = (name || 'upload').split(/[\\/]/).pop() || 'upload'
  return base.replace(/[^\w.\-]/g, '_').slice(0, 120) || 'upload'
}

export const POST = route(async (request) => {
  const ctx = await requireOrganization({ write: true })
  await enforceRateLimit(`upload:${ctx.user.id}`, 30, 60)

  const formData = await request.formData()
  const file = formData.get('file')
  const purpose = (formData.get('purpose') as string | null) === 'LOGO' ? 'LOGO' : 'PAYMENT_PROOF'

  if (purpose === 'LOGO') {
    requirePermission(ctx, 'settings.manage')
    requireFeature(ctx, 'customBranding')
  } else {
    requirePermission(ctx, 'payment.manage')
    requireFeature(ctx, 'paymentProofs')
  }

  if (!(file instanceof File)) throw badRequest('No file provided.')
  const allowed: readonly string[] = PURPOSES[purpose]
  if (!allowed.includes(file.type)) {
    throw badRequest(purpose === 'LOGO' ? 'Logo must be a PNG, JPG or WebP image.' : 'Allowed file types: PDF, JPG, PNG, WebP, GIF.')
  }
  if (file.size > MAX_SIZE) throw badRequest('File too large. Maximum size is 5 MB.')

  const buffer = Buffer.from(await file.arrayBuffer())
  if (buffer.length > MAX_SIZE) throw badRequest('File too large. Maximum size is 5 MB.')
  if (!matchesSignature(file.type, buffer)) throw badRequest("The file's contents don't match its type.")

  await checkUsageLimit(ctx, 'storage', buffer.length / (1024 * 1024))

  const upload = await prisma.upload.create({
    data: {
      organizationId: ctx.organization.id,
      purpose,
      filename: sanitizeFilename(file.name),
      mimeType: file.type,
      size: buffer.length,
      data: buffer,
      checksum: crypto.createHash('sha256').update(buffer).digest('hex'),
      userId: ctx.user.id,
    },
    select: { id: true, filename: true, mimeType: true, size: true },
  })

  return { ...upload, url: `/api/files/${upload.id}.${EXT_BY_MIME[file.type] ?? 'bin'}` }
})
