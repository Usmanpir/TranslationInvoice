import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const customerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1, 'Phone is required'),
  address: z.string().optional(),
  company: z.string().optional(),
  taxNumber: z.string().optional(),
})

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const customer = await prisma.customer.findFirst({
      where: { id: params.id, userId: session.user.id },
      include: {
        invoices: { orderBy: { createdAt: 'desc' }, take: 5 },
        _count: { select: { invoices: true } },
      },
    })

    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    return NextResponse.json(customer)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const data = customerSchema.parse(body)

    const customer = await prisma.customer.findFirst({ where: { id: params.id, userId: session.user.id } })
    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

    const updated = await prisma.customer.update({ where: { id: params.id }, data })
    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const customer = await prisma.customer.findFirst({ where: { id: params.id, userId: session.user.id } })
    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

    await prisma.customer.delete({ where: { id: params.id } })
    return NextResponse.json({ message: 'Customer deleted' })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
