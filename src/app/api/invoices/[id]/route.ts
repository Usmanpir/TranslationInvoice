import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { route, parseJson } from '@/lib/server/api'
import { requireOrganization } from '@/lib/server/context'
import { badRequest, notFound } from '@/lib/server/errors'
import { hasFeature } from '@/lib/server/subscription'
import { audit } from '@/lib/server/audit'
import {
  assertCurrencyAllowed,
  assertCustomerInOrg,
  buildLineItems,
  computeTotals,
  dateString,
  documentFieldsSchema,
  issuerFor,
} from '@/lib/server/documents'

type Params = { id: string }

const updateSchema = documentFieldsSchema.partial().extend({
  dueDate: dateString.optional(),
  issueDate: dateString.optional(),
  // PAID is set only through /payments so every paid invoice has a payment record.
  status: z.enum(['PENDING', 'OVERDUE', 'CANCELLED']).optional(),
})

async function findInvoice(organizationId: string, id: string) {
  const invoice = await prisma.invoice.findFirst({ where: { id, organizationId } })
  if (!invoice) throw notFound('Invoice')
  return invoice
}

export const GET = route<Params>(async (_request, { params }) => {
  const { id } = await params
  const ctx = await requireOrganization({ permission: 'invoice.view' })
  const invoice = await prisma.invoice.findFirst({
    where: { id, organizationId: ctx.organization.id },
    include: {
      customer: true,
      items: true,
      quotation: { select: { id: true, quotationNumber: true } },
      user: { select: { id: true, name: true } },
      payments: {
        orderBy: { paidAt: 'desc' },
        include: { recordedBy: { select: { id: true, name: true } } },
      },
    },
  })
  if (!invoice) throw notFound('Invoice')
  return { ...invoice, issuer: issuerFor(ctx.organization, hasFeature(ctx, 'customBranding')) }
})

export const PUT = route<Params>(async (request, { params }) => {
  const { id } = await params
  const ctx = await requireOrganization({ permission: 'invoice.edit', write: true })
  const orgId = ctx.organization.id
  const invoice = await findInvoice(orgId, id)
  const data = await parseJson(request, updateSchema)

  if (data.status && invoice.status === 'PAID') {
    throw badRequest('This invoice is paid. Mark it unpaid first to change its status.')
  }
  if (data.customerId && data.customerId !== invoice.customerId) await assertCustomerInOrg(orgId, data.customerId)
  if (data.currency) assertCurrencyAllowed(ctx, data.currency, invoice.currency)

  const totals = data.items
    ? computeTotals({
        items: data.items,
        taxRate: data.taxRate ?? invoice.taxRate,
        discount: data.discount ?? invoice.discount,
        taxInclusive: data.taxInclusive ?? invoice.taxInclusive,
      })
    : {}

  const updated = await prisma.invoice.update({
    where: { id },
    data: {
      ...(data.customerId && { customerId: data.customerId }),
      ...(data.dueDate && { dueDate: new Date(data.dueDate) }),
      ...(data.issueDate && { issueDate: new Date(data.issueDate) }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.status && { status: data.status }),
      ...(data.currency && { currency: data.currency }),
      ...(data.salesperson !== undefined && { salesperson: data.salesperson }),
      ...(data.completionDays !== undefined && { completionDays: data.completionDays }),
      ...(data.taxRate !== undefined && { taxRate: data.taxRate }),
      ...(data.taxInclusive !== undefined && { taxInclusive: data.taxInclusive }),
      ...(data.discount !== undefined && { discount: data.discount }),
      ...totals,
      ...(data.items && { items: { deleteMany: {}, create: buildLineItems(data.items) } }),
    },
    include: { customer: true, items: true },
  })

  await audit({
    organizationId: orgId,
    userId: ctx.user.id,
    action: 'invoice.updated',
    entityType: 'invoice',
    entityId: id,
    metadata: { invoiceNumber: invoice.invoiceNumber, fields: Object.keys(data) },
  })
  return updated
})

export const DELETE = route<Params>(async (_request, { params }) => {
  const { id } = await params
  const ctx = await requireOrganization({ permission: 'invoice.delete', write: true })
  const invoice = await findInvoice(ctx.organization.id, id)

  await prisma.$transaction([
    // A deleted invoice frees its quotation so it can be converted again.
    ...(invoice.quotationId
      ? [prisma.quotation.update({ where: { id: invoice.quotationId }, data: { convertedToInvoice: false, status: 'ACCEPTED' } })]
      : []),
    prisma.invoice.delete({ where: { id } }),
  ])

  await audit({
    organizationId: ctx.organization.id,
    userId: ctx.user.id,
    action: 'invoice.deleted',
    entityType: 'invoice',
    entityId: id,
    metadata: { invoiceNumber: invoice.invoiceNumber, total: invoice.total, currency: invoice.currency },
  })
  return { id }
})
