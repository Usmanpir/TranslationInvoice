import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
}

const MAX_SIZE = 5 * 1024 * 1024 // 5MB

function sanitizeFilename(name: string) {
  const base = (name || 'upload').split(/[\\/]/).pop() || 'upload'
  return base.replace(/[^\w.\-]/g, '_').slice(0, 120) || 'upload'
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF, PDF' },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 5MB' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    if (buffer.length > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 5MB' }, { status: 400 })
    }

    const checksum = crypto.createHash('sha256').update(buffer).digest('hex')
    const filename = sanitizeFilename(file.name)
    const ext = EXT_BY_MIME[file.type] ?? 'bin'

    const upload = await prisma.upload.create({
      data: {
        filename,
        mimeType: file.type,
        size: buffer.length,
        data: buffer,
        checksum,
        userId: session.user.id,
      },
      select: { id: true },
    })

    return NextResponse.json({
      url: `/api/files/${upload.id}.${ext}`,
      id: upload.id,
      filename,
      mimeType: file.type,
      size: buffer.length,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
