import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { route } from '@/lib/server/api'
import { requireAuth } from '@/lib/server/context'
import { notFound } from '@/lib/server/errors'

type Params = { id: string }

function stripExt(raw: string) {
  const i = raw.lastIndexOf('.')
  return i > 0 ? raw.slice(0, i) : raw
}

/** Serves a private upload to members of the organization that owns it. */
export const GET = route<Params>(async (request, { params }) => {
  const user = await requireAuth()
  const id = stripExt((await params).id || '')
  if (!id) throw notFound('File')

  const meta = await prisma.upload.findUnique({ where: { id }, select: { organizationId: true } })
  // 404 (not 403) for files in other organizations, so their existence isn't revealed.
  if (!meta) throw notFound('File')
  const member = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId: user.id, organizationId: meta.organizationId } },
    select: { id: true },
  })
  if (!member) throw notFound('File')

  const etag = `"${id}"`
  if (request.headers.get('if-none-match') === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag } })
  }

  const file = await prisma.upload.findUnique({
    where: { id },
    select: { filename: true, mimeType: true, size: true, data: true },
  })
  if (!file) throw notFound('File')

  return new NextResponse(new Uint8Array(file.data as unknown as Buffer), {
    status: 200,
    headers: {
      'Content-Type': file.mimeType,
      'Content-Length': String(file.size),
      'Content-Disposition': `inline; filename="${file.filename.replace(/"/g, '')}"`,
      'Cache-Control': 'private, max-age=31536000, immutable',
      ETag: etag,
      'X-Content-Type-Options': 'nosniff',
    },
  })
})
