import { prisma } from '@/lib/prisma'
import { route } from '@/lib/server/api'
import { requireOrganization } from '@/lib/server/context'
import { notFound } from '@/lib/server/errors'
import { requireFeature } from '@/lib/server/subscription'
import { toCsv, type CsvColumn } from '@/lib/server/csv'

type Params = { type: string }

const MAX_ROWS = 10_000
const iso = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : '')

/** CSV exports. The format layer (toCsv) is separate so Excel/PDF writers can be added later. */
export const GET = route<Params>(async (request, { params }) => {
  const { type } = await params
  const ctx = await requireOrganization({ permission: 'export.data' })
  requireFeature(ctx, 'dataExport')
  const orgId = ctx.organization.id
  const url = new URL(request.url)
  const status = url.searchParams.get('status') || undefined

  let filename: string
  let csv: string

  switch (type) {
    case 'invoices': {
      const rows = await prisma.invoice.findMany({
        where: { organizationId: orgId, ...(status && { status: status as any }) },
        include: { customer: { select: { name: true, company: true, taxNumber: true } } },
        orderBy: { issueDate: 'desc' },
        take: MAX_ROWS,
      })
      const cols: CsvColumn<(typeof rows)[number]>[] = [
        { header: 'Invoice number', value: (r) => r.invoiceNumber },
        { header: 'Status', value: (r) => r.status },
        { header: 'Issue date', value: (r) => iso(r.issueDate) },
        { header: 'Due date', value: (r) => iso(r.dueDate) },
        { header: 'Paid date', value: (r) => iso(r.paidAt) },
        { header: 'Customer', value: (r) => r.customer.name },
        { header: 'Company', value: (r) => r.customer.company ?? '' },
        { header: 'Customer TRN', value: (r) => r.customer.taxNumber ?? '' },
        { header: 'Currency', value: (r) => r.currency },
        { header: 'Subtotal', value: (r) => r.subtotal },
        { header: 'Discount', value: (r) => r.discountAmount },
        { header: 'Tax rate %', value: (r) => r.taxRate },
        { header: 'Tax', value: (r) => r.taxAmount },
        { header: 'Total', value: (r) => r.total },
      ]
      filename = 'invoices'
      csv = toCsv(rows, cols)
      break
    }
    case 'customers': {
      const rows = await prisma.customer.findMany({
        where: { organizationId: orgId },
        include: { _count: { select: { invoices: true } } },
        orderBy: { name: 'asc' },
        take: MAX_ROWS,
      })
      const cols: CsvColumn<(typeof rows)[number]>[] = [
        { header: 'Name', value: (r) => r.name },
        { header: 'Company', value: (r) => r.company ?? '' },
        { header: 'Email', value: (r) => r.email },
        { header: 'Phone', value: (r) => r.phone ?? '' },
        { header: 'TRN', value: (r) => r.taxNumber ?? '' },
        { header: 'Address', value: (r) => r.address ?? '' },
        { header: 'Invoices', value: (r) => r._count.invoices },
        { header: 'Created', value: (r) => iso(r.createdAt) },
      ]
      filename = 'customers'
      csv = toCsv(rows, cols)
      break
    }
    case 'payments': {
      const rows = await prisma.payment.findMany({
        where: { organizationId: orgId },
        include: { invoice: { select: { invoiceNumber: true, customer: { select: { name: true } } } } },
        orderBy: { paidAt: 'desc' },
        take: MAX_ROWS,
      })
      const cols: CsvColumn<(typeof rows)[number]>[] = [
        { header: 'Paid date', value: (r) => iso(r.paidAt) },
        { header: 'Invoice', value: (r) => r.invoice.invoiceNumber },
        { header: 'Customer', value: (r) => r.invoice.customer.name },
        { header: 'Method', value: (r) => r.method },
        { header: 'Reference', value: (r) => r.reference ?? '' },
        { header: 'Currency', value: (r) => r.currency },
        { header: 'Amount', value: (r) => r.amount },
      ]
      filename = 'payments'
      csv = toCsv(rows, cols)
      break
    }
    case 'revenue': {
      const rows = await prisma.$queryRaw<{ month: Date; currency: string; payments: bigint; total: number }[]>`
        SELECT date_trunc('month', "paidAt") AS month, "currency", COUNT(*) AS payments, SUM("amount")::float AS total
        FROM "Payment" WHERE "organizationId" = ${orgId}
        GROUP BY 1, 2 ORDER BY 1 DESC, 2
      `
      const cols: CsvColumn<(typeof rows)[number]>[] = [
        { header: 'Month', value: (r) => iso(new Date(r.month)).slice(0, 7) },
        { header: 'Currency', value: (r) => r.currency },
        { header: 'Payments', value: (r) => Number(r.payments) },
        { header: 'Revenue', value: (r) => r.total },
      ]
      filename = 'revenue-by-month'
      csv = toCsv(rows, cols)
      break
    }
    default:
      throw notFound('Export')
  }

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}-${iso(new Date())}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
})
