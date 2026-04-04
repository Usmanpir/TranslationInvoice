import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateInvoiceTotals } from '@/lib/utils'
import { z } from 'zod'

const itemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().min(0.01),
  unitPrice: z.number().min(0),
})

const updateSchema = z.object({
  customerId: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['PENDING', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  discount: z.number().min(0).max(100).optional(),
  items: z.array(itemSchema).optional(),
})

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const invoice = await prisma.invoice.findFirst({
      where: { id: params.id, userId: session.user.id },
      include: { customer: true, items: true, user: true },
    })

    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    return NextResponse.json(invoice)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const invoice = await prisma.invoice.findFirst({ where: { id: params.id, userId: session.user.id } })
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

    const body = await request.json()
    const { customerId, dueDate, notes, status, taxRate, discount, items } = updateSchema.parse(body)

    let totals = {}
    if (items) {
      const tr = taxRate ?? invoice.taxRate
      const dis = discount ?? invoice.discount
      totals = calculateInvoiceTotals(items, tr, dis)
    }

    const updated = await prisma.invoice.update({
      where: { id: params.id },
      data: {
        ...(customerId && { customerId }),
        ...(dueDate && { dueDate: new Date(dueDate) }),
        ...(notes !== undefined && { notes }),
        ...(status && { status }),
        ...(taxRate !== undefined && { taxRate }),
        ...(discount !== undefined && { discount }),
        ...totals,
        ...(items && {
          items: {
            deleteMany: {},
            create: items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.quantity * item.unitPrice,
            })),
          },
        }),
      },
      include: { customer: true, items: true },
    })

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

    const invoice = await prisma.invoice.findFirst({ where: { id: params.id, userId: session.user.id } })
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

    await prisma.invoice.delete({ where: { id: params.id } })
    return NextResponse.json({ message: 'Invoice deleted' })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
