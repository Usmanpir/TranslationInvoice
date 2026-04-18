import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateInvoiceTotals } from '@/lib/utils'
import { z } from 'zod'

const itemSchema = z.object({
  code: z.string().optional().default(''),
  description: z.string().min(1),
  quantity: z.number().min(0.01),
  unitPrice: z.number().min(0),
})

const updateSchema = z.object({
  customerId: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['PENDING', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
  paymentProof: z.string().nullable().optional(),
  currency: z.enum(['USD', 'EUR', 'AED']).optional(),
  salesperson: z.string().nullable().optional(),
  completionDays: z.string().nullable().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  discount: z.number().min(0).max(100).optional(),
  items: z.array(itemSchema).optional(),
})

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = session.user.role === 'admin'
    const invoice = await prisma.invoice.findFirst({
      where: { id: params.id, ...(isAdmin ? {} : { userId: session.user.id }) },
      include: {
        customer: true,
        items: true,
        quotation: { select: { id: true, quotationNumber: true } },
        user: {
          select: {
            name: true, email: true, companyName: true, address: true, phone: true,
            taxNumber: true, bankName: true, bankBranch: true, bankAccountName: true,
            bankAccountNumber: true, iban: true, swiftCode: true, paypalEmail: true,
          },
        },
      },
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

    const isAdmin = session.user.role === 'admin'
    const invoice = await prisma.invoice.findFirst({
      where: { id: params.id, ...(isAdmin ? {} : { userId: session.user.id }) },
    })
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

    const body = await request.json()
    const { customerId, dueDate, notes, status, paymentProof, currency, salesperson, completionDays, taxRate, discount, items } = updateSchema.parse(body)

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
        ...(paymentProof !== undefined && { paymentProof }),
        ...(currency && { currency }),
        ...(salesperson !== undefined && { salesperson }),
        ...(completionDays !== undefined && { completionDays }),
        ...(taxRate !== undefined && { taxRate }),
        ...(discount !== undefined && { discount }),
        ...totals,
        ...(items && {
          items: {
            deleteMany: {},
            create: items.map((item) => ({
              code: item.code || null,
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
    if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })

    const invoice = await prisma.invoice.findFirst({ where: { id: params.id } })
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

    await prisma.invoice.delete({ where: { id: params.id } })
    return NextResponse.json({ message: 'Invoice deleted' })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
