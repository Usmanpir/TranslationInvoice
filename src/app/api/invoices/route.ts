import type { Prisma, InvoiceStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { route, parseJson, parsePagination, paginated } from '@/lib/server/api'
import { requireOrganization } from '@/lib/server/context'
import { checkUsageLimit } from '@/lib/server/subscription'
import { audit } from '@/lib/server/audit'
import { createWithDocumentNumber } from '@/lib/server/numbering'
import { syncOverdueInvoices } from '@/lib/server/invoices'
import {
  assertCurrencyAllowed,
  assertCustomerInOrg,
  buildLineItems,
  computeTotals,
  dateString,
  documentFieldsSchema,
} from '@/lib/server/documents'

const createSchema = documentFieldsSchema.extend({
  dueDate: dateString,
  issueDate: dateString.optional(),
})

const STATUSES: InvoiceStatus[] = ['PENDING', 'PAID', 'OVERDUE', 'CANCELLED']

function parseDate(value: string | null, endOfDay = false) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  if (endOfDay) d.setHours(23, 59, 59, 999)
  return d
}

export const GET = route(async (request) => {
  const ctx = await requireOrganization({ permission: 'invoice.view' })
  const orgId = ctx.organization.id
  await syncOverdueInvoices(orgId)

  const url = new URL(request.url)
  const p = parsePagination(url)
  const q = url.searchParams
  const search = (q.get('search') || '').trim().slice(0, 100)
  const status = q.get('status') as InvoiceStatus | null
  const from = parseDate(q.get('from'))
  const to = parseDate(q.get('to'), true)
  const min = q.get('min') ? Number(q.get('min')) : null
  const max = q.get('max') ? Number(q.get('max')) : null
  const customerId = q.get('customerId')

  const where: Prisma.InvoiceWhereInput = {
    organizationId: orgId,
    ...(status && STATUSES.includes(status) && { status }),
    ...(customerId && { customerId }),
    ...((from || to) && { issueDate: { ...(from && { gte: from }), ...(to && { lte: to }) } }),
    ...((Number.isFinite(min) || Number.isFinite(max)) && {
      total: { ...(Number.isFinite(min) && { gte: min! }), ...(Number.isFinite(max) && { lte: max! }) },
    }),
    ...(search && {
      OR: [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { company: { contains: search, mode: 'insensitive' } } },
      ],
    }),
  }

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, company: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: p.skip,
      take: p.limit,
    }),
    prisma.invoice.count({ where }),
  ])

  return paginated(invoices, total, p)
})

export const POST = route(async (request) => {
  const ctx = await requireOrganization({ permission: 'invoice.create', write: true })
  const orgId = ctx.organization.id
  const data = await parseJson(request, createSchema)

  await checkUsageLimit(ctx, 'invoices')
  await assertCustomerInOrg(orgId, data.customerId)
  assertCurrencyAllowed(ctx, data.currency)

  const totals = computeTotals(data)
  const issueDate = data.issueDate ? new Date(data.issueDate) : new Date()

  const invoice = await createWithDocumentNumber(
    orgId,
    'invoice',
    (tx, invoiceNumber) =>
      tx.invoice.create({
        data: {
          organizationId: orgId,
          invoiceNumber,
          customerId: data.customerId,
          userId: ctx.user.id,
          issueDate,
          dueDate: new Date(data.dueDate),
          notes: data.notes,
          currency: data.currency,
          salesperson: data.salesperson,
          completionDays: data.completionDays,
          taxRate: data.taxRate,
          taxInclusive: data.taxInclusive ?? false,
          discount: data.discount,
          ...totals,
          items: { create: buildLineItems(data.items) },
        },
        include: { customer: true, items: true },
      }),
    { date: issueDate }
  )

  await audit({
    organizationId: orgId,
    userId: ctx.user.id,
    action: 'invoice.created',
    entityType: 'invoice',
    entityId: invoice.id,
    metadata: { invoiceNumber: invoice.invoiceNumber, total: invoice.total, currency: invoice.currency },
  })
  return invoice
})
