import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = session.user.role === 'admin'
    const scope: any = isAdmin ? {} : { userId: session.user.id }

    const { searchParams } = new URL(request.url)
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')

    const from = fromParam ? new Date(fromParam) : null
    let to: Date | null = null
    if (toParam) {
      to = new Date(toParam)
      // treat `to` as inclusive end-of-day
      to.setHours(23, 59, 59, 999)
    }
    const validFrom = from && !isNaN(from.getTime()) ? from : null
    const validTo = to && !isNaN(to.getTime()) ? to : null

    const invoiceWhere: any = { ...scope }
    const customerWhere: any = { ...scope }
    if (validFrom || validTo) {
      invoiceWhere.issueDate = {
        ...(validFrom && { gte: validFrom }),
        ...(validTo && { lte: validTo }),
      }
      customerWhere.createdAt = {
        ...(validFrom && { gte: validFrom }),
        ...(validTo && { lte: validTo }),
      }
    }

    const [invoices, customers, recentInvoices] = await Promise.all([
      prisma.invoice.findMany({ where: invoiceWhere }),
      prisma.customer.count({ where: customerWhere }),
      prisma.invoice.findMany({
        where: invoiceWhere,
        include: {
          customer: true,
          ...(isAdmin && { user: { select: { id: true, name: true, companyName: true } } }),
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ])

    const totalInvoices = invoices.length
    const paidInvoices = invoices.filter((i) => i.status === 'PAID').length
    const pendingInvoices = invoices.filter((i) => i.status === 'PENDING').length
    const overdueInvoices = invoices.filter((i) => i.status === 'OVERDUE').length
    const totalRevenue = invoices.filter((i) => i.status === 'PAID').reduce((sum, i) => sum + i.total, 0)
    const pendingRevenue = invoices.filter((i) => i.status === 'PENDING').reduce((sum, i) => sum + i.total, 0)

    return NextResponse.json({
      stats: { totalInvoices, paidInvoices, pendingInvoices, overdueInvoices, totalRevenue, pendingRevenue, customers },
      recentInvoices,
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
