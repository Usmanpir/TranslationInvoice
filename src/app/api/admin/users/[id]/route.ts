import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

function isAdmin(role?: string) {
  return role === 'admin'
}

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(['user', 'admin']).optional(),
  companyName: z.string().optional(),
})

// PUT /api/admin/users/[id] - Update user role/details (admin only)
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const data = updateUserSchema.parse(body)

    const user = await prisma.user.findUnique({ where: { id: params.id } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent admin from removing their own admin role
    if (params.id === session.user.id && data.role && data.role !== 'admin') {
      return NextResponse.json({ error: 'Cannot remove your own admin role' }, { status: 400 })
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data,
      select: { id: true, name: true, email: true, role: true, companyName: true, createdAt: true },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Admin users PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/users/[id] - Delete a user (admin only)
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    // Prevent admin from deleting themselves
    if (params.id === session.user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id: params.id } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    await prisma.user.delete({ where: { id: params.id } })
    return NextResponse.json({ message: 'User deleted' })
  } catch (error) {
    console.error('Admin users DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
