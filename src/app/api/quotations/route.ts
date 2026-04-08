import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateInvoiceNumber, calculateInvoiceTotals } from '@/lib/utils'
import { z } from 'zod'

const itemSchema = z.object({
  code: z.string().optional().default(''),
  description: z.string().min(1),
  quantity: z.number().min(0.01),
  unitPrice: z.number().min(0),
})

const quotationSchema = z.object({
  customerId: z.string().min(1),
  validUntil: z.string(),
  notes: z.string().optional(),
  currency: z.enum(['USD', 'EUR', 'AED']).default('AED'),
  salesperson: z.string().optional(),
  completionDays: z.string().optional(),
  taxRate: z.number().min(0).max(100).default(0),
  discount: z.number().min(0).max(100).default(0),
  items: z.array(itemSchema).min(1),
})

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const where: any = { userId: session.user.id }
    if (status) where.status = status
    if (search) {
      where.OR = [
        { quotationNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const [quotations, total] = await Promise.all([
      prisma.quotation.findMany({
        where,
        include: { customer: true, items: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.quotation.count({ where }),
    ])

    return NextResponse.json({ quotations, total, pages: Math.ceil(total / limit), page })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { customerId, validUntil, notes, currency, salesperson, completionDays, taxRate, discount, items } = quotationSchema.parse(body)

    const customer = await prisma.customer.findFirst({ where: { id: customerId, userId: session.user.id } })
    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

    const totals = calculateInvoiceTotals(items, taxRate, discount)
    const quotationNumber = generateInvoiceNumber('QUO')

    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber,
        customerId,
        userId: session.user.id,
        validUntil: new Date(validUntil),
        notes,
        currency,
        salesperson,
        completionDays,
        taxRate,
        discount,
        ...totals,
        items: {
          create: items.map((item) => ({
            code: item.code || null,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
          })),
        },
      },
      include: { customer: true, items: true },
    })

    return NextResponse.json(quotation, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
