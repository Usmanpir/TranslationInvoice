import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function stripExt(raw: string) {
  const i = raw.lastIndexOf('.')
  return i > 0 ? raw.slice(0, i) : raw
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = stripExt(params.id || '')
    if (!id) return NextResponse.json({ error: 'File not found' }, { status: 404 })

    const etag = `"${id}"`
    if (request.headers.get('if-none-match') === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag } })
    }

    const meta = await prisma.upload.findUnique({
      where: { id },
      select: { id: true, userId: true },
    })
    if (!meta) return NextResponse.json({ error: 'File not found' }, { status: 404 })

    const isAdmin = session.user.role === 'admin'
    if (!isAdmin && meta.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const file = await prisma.upload.findUnique({
      where: { id },
      select: { filename: true, mimeType: true, size: true, data: true },
    })
    if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 })

    const body = new Uint8Array(file.data as unknown as Buffer)

    return new NextResponse(body, {
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
  } catch (error) {
    console.error('File fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch file' }, { status: 500 })
  }
}
