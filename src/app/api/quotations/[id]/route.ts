import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateInvoiceNumber } from '@/lib/utils'
import { z } from 'zod'

const updateSchema = z.object({
  customerId: z.string().optional(),
  validUntil: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'CONVERTED']).optional(),
})

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const quotation = await prisma.quotation.findFirst({
      where: { id: params.id, userId: session.user.id },
      include: {
        customer: true,
        items: true,
        user: {
          select: {
            name: true, email: true, companyName: true, address: true, phone: true,
            taxNumber: true, bankName: true, bankBranch: true, bankAccountName: true,
            bankAccountNumber: true, iban: true, swiftCode: true, paypalEmail: true,
          },
        },
      },
    })

    if (!quotation) return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
    return NextResponse.json(quotation)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const quotation = await prisma.quotation.findFirst({ where: { id: params.id, userId: session.user.id } })
    if (!quotation) return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })

    const body = await request.json()

    // Handle convert action
    if (body.action === 'convert') {
      if (quotation.convertedToInvoice) {
        return NextResponse.json({ error: 'Already converted to invoice' }, { status: 400 })
      }

      const invoiceNumber = generateInvoiceNumber('INV')
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 30)

      const items = await prisma.quotationItem.findMany({ where: { quotationId: params.id } })

      const [invoice] = await prisma.$transaction([
        prisma.invoice.create({
          data: {
            invoiceNumber,
            customerId: quotation.customerId,
            userId: quotation.userId,
            quotationId: quotation.id,
            dueDate,
            notes: quotation.notes,
            currency: quotation.currency,
            salesperson: quotation.salesperson,
            completionDays: quotation.completionDays,
            taxRate: quotation.taxRate,
            discount: quotation.discount,
            subtotal: quotation.subtotal,
            taxAmount: quotation.taxAmount,
            discountAmount: quotation.discountAmount,
            total: quotation.total,
            items: {
              create: items.map((item) => ({
                code: item.code,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.total,
              })),
            },
          },
          include: { customer: true, items: true },
        }),
        prisma.quotation.update({
          where: { id: params.id },
          data: { status: 'CONVERTED', convertedToInvoice: true },
        }),
      ])

      return NextResponse.json({ invoice, message: 'Quotation converted to invoice' })
    }

    const { customerId, validUntil, notes, status } = updateSchema.parse(body)

    const updated = await prisma.quotation.update({
      where: { id: params.id },
      data: {
        ...(customerId && { customerId }),
        ...(validUntil && { validUntil: new Date(validUntil) }),
        ...(notes !== undefined && { notes }),
        ...(status && { status }),
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

    const quotation = await prisma.quotation.findFirst({ where: { id: params.id, userId: session.user.id } })
    if (!quotation) return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })

    await prisma.quotation.delete({ where: { id: params.id } })
    return NextResponse.json({ message: 'Quotation deleted' })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
