import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    const [invoices, customers, recentInvoices] = await Promise.all([
      prisma.invoice.findMany({ where: { userId } }),
      prisma.customer.count({ where: { userId } }),
      prisma.invoice.findMany({
        where: { userId },
        include: { customer: true },
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
