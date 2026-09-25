import type { Prisma, QuotationStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { route, parseJson, parsePagination, paginated } from '@/lib/server/api'
import { requireOrganization } from '@/lib/server/context'
import { checkUsageLimit } from '@/lib/server/subscription'
import { audit } from '@/lib/server/audit'
import { createWithDocumentNumber } from '@/lib/server/numbering'
import {
  assertCurrencyAllowed,
  assertCustomerInOrg,
  buildLineItems,
  computeTotals,
  dateString,
  documentFieldsSchema,
} from '@/lib/server/documents'

const createSchema = documentFieldsSchema.extend({
  validUntil: dateString,
  issueDate: dateString.optional(),
})

const STATUSES: QuotationStatus[] = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'CONVERTED']

export const GET = route(async (request) => {
  const ctx = await requireOrganization({ permission: 'quotation.view' })
  const url = new URL(request.url)
  const p = parsePagination(url)
  const search = (url.searchParams.get('search') || '').trim().slice(0, 100)
  const status = url.searchParams.get('status') as QuotationStatus | null
  const customerId = url.searchParams.get('customerId')

  const where: Prisma.QuotationWhereInput = {
    organizationId: ctx.organization.id,
    ...(status && STATUSES.includes(status) && { status }),
    ...(customerId && { customerId }),
    ...(search && {
      OR: [
        { quotationNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { company: { contains: search, mode: 'insensitive' } } },
      ],
    }),
  }

  const [quotations, total] = await Promise.all([
    prisma.quotation.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, company: true } },
        invoice: { select: { id: true, invoiceNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: p.skip,
      take: p.limit,
    }),
    prisma.quotation.count({ where }),
  ])

  return paginated(quotations, total, p)
})

export const POST = route(async (request) => {
  const ctx = await requireOrganization({ permission: 'quotation.create', write: true })
  const orgId = ctx.organization.id
  const data = await parseJson(request, createSchema)

  await checkUsageLimit(ctx, 'quotations')
  await assertCustomerInOrg(orgId, data.customerId)
  assertCurrencyAllowed(ctx, data.currency)

  const totals = computeTotals(data)
  const issueDate = data.issueDate ? new Date(data.issueDate) : new Date()

  const quotation = await createWithDocumentNumber(
    orgId,
    'quotation',
    (tx, quotationNumber) =>
      tx.quotation.create({
        data: {
          organizationId: orgId,
          quotationNumber,
          customerId: data.customerId,
          userId: ctx.user.id,
          issueDate,
          validUntil: new Date(data.validUntil),
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
    action: 'quotation.created',
    entityType: 'quotation',
    entityId: quotation.id,
    metadata: { quotationNumber: quotation.quotationNumber, total: quotation.total, currency: quotation.currency },
  })
  return quotation
})
