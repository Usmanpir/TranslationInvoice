import { prisma } from '@/lib/prisma'
import { route, parseJson } from '@/lib/server/api'
import { requireOrganization } from '@/lib/server/context'
import { ApiError, notFound } from '@/lib/server/errors'
import { audit } from '@/lib/server/audit'
import { customerSchema } from '@/lib/server/schemas'

type Params = { id: string }

async function findCustomer(organizationId: string, id: string) {
  const customer = await prisma.customer.findFirst({ where: { id, organizationId } })
  if (!customer) throw notFound('Customer')
  return customer
}

export const GET = route<Params>(async (_request, { params }) => {
  const { id } = await params
  const ctx = await requireOrganization({ permission: 'customer.view' })
  const orgId = ctx.organization.id
  const customer = await findCustomer(orgId, id)

  const [invoices, quotations, payments, byStatus] = await Promise.all([
    prisma.invoice.findMany({
      where: { organizationId: orgId, customerId: id },
      orderBy: { issueDate: 'desc' },
      take: 50,
      select: { id: true, invoiceNumber: true, status: true, issueDate: true, dueDate: true, total: true, currency: true },
    }),
    prisma.quotation.findMany({
      where: { organizationId: orgId, customerId: id },
      orderBy: { issueDate: 'desc' },
      take: 50,
      select: {
        id: true,
        quotationNumber: true,
        status: true,
        issueDate: true,
        validUntil: true,
        total: true,
        currency: true,
        invoice: { select: { id: true, invoiceNumber: true } },
      },
    }),
    prisma.payment.findMany({
      where: { organizationId: orgId, invoice: { customerId: id } },
      orderBy: { paidAt: 'desc' },
      take: 50,
      select: {
        id: true,
        amount: true,
        currency: true,
        method: true,
        paidAt: true,
        reference: true,
        invoice: { select: { id: true, invoiceNumber: true } },
      },
    }),
    prisma.invoice.groupBy({
      by: ['status', 'currency'],
      where: { organizationId: orgId, customerId: id },
      _sum: { total: true },
      _count: { _all: true },
    }),
  ])

  // Totals per currency — amounts in different currencies are never summed together.
  const summary: Record<string, { paid: number; pending: number; overdue: number }> = {}
  let totalInvoices = 0
  for (const row of byStatus) {
    totalInvoices += row._count._all
    const s = (summary[row.currency] ??= { paid: 0, pending: 0, overdue: 0 })
    const sum = row._sum.total ?? 0
    if (row.status === 'PAID') s.paid += sum
    else if (row.status === 'PENDING') s.pending += sum
    else if (row.status === 'OVERDUE') s.overdue += sum
  }

  return { ...customer, stats: { totalInvoices, totalQuotations: quotations.length, byCurrency: summary }, invoices, quotations, payments }
})

export const PUT = route<Params>(async (request, { params }) => {
  const { id } = await params
  const ctx = await requireOrganization({ permission: 'customer.manage', write: true })
  await findCustomer(ctx.organization.id, id)
  const data = await parseJson(request, customerSchema)

  const updated = await prisma.customer.update({ where: { id }, data })
  await audit({
    organizationId: ctx.organization.id,
    userId: ctx.user.id,
    action: 'customer.updated',
    entityType: 'customer',
    entityId: id,
  })
  return updated
})

export const DELETE = route<Params>(async (_request, { params }) => {
  const { id } = await params
  const ctx = await requireOrganization({ permission: 'customer.delete', write: true })
  const customer = await findCustomer(ctx.organization.id, id)

  const [invoiceCount, quotationCount] = await Promise.all([
    prisma.invoice.count({ where: { customerId: id } }),
    prisma.quotation.count({ where: { customerId: id } }),
  ])
  if (invoiceCount + quotationCount > 0) {
    throw new ApiError(
      'CONFLICT',
      `${customer.name} has ${invoiceCount} invoice(s) and ${quotationCount} quotation(s). Delete those first to keep your records consistent.`
    )
  }

  await prisma.customer.delete({ where: { id } })
  await audit({
    organizationId: ctx.organization.id,
    userId: ctx.user.id,
    action: 'customer.deleted',
    entityType: 'customer',
    entityId: id,
    metadata: { name: customer.name },
  })
  return { id }
})
