import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { route, parseJson } from '@/lib/server/api'
import { requireOrganization } from '@/lib/server/context'
import { badRequest, notFound } from '@/lib/server/errors'
import { hasFeature } from '@/lib/server/subscription'
import { audit } from '@/lib/server/audit'
import { notify } from '@/lib/server/notifications'
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
  validUntil: dateString.optional(),
  issueDate: dateString.optional(),
  // CONVERTED is set only by the convert endpoint.
  status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED']).optional(),
})

async function findQuotation(organizationId: string, id: string) {
  const quotation = await prisma.quotation.findFirst({ where: { id, organizationId } })
  if (!quotation) throw notFound('Quotation')
  return quotation
}

export const GET = route<Params>(async (_request, { params }) => {
  const { id } = await params
  const ctx = await requireOrganization({ permission: 'quotation.view' })
  const quotation = await prisma.quotation.findFirst({
    where: { id, organizationId: ctx.organization.id },
    include: {
      customer: true,
      items: true,
      invoice: { select: { id: true, invoiceNumber: true } },
      user: { select: { id: true, name: true } },
    },
  })
  if (!quotation) throw notFound('Quotation')
  return { ...quotation, issuer: issuerFor(ctx.organization, hasFeature(ctx, 'customBranding')) }
})

export const PUT = route<Params>(async (request, { params }) => {
  const { id } = await params
  const ctx = await requireOrganization({ permission: 'quotation.edit', write: true })
  const orgId = ctx.organization.id
  const quotation = await findQuotation(orgId, id)
  const data = await parseJson(request, updateSchema)

  if (quotation.convertedToInvoice && (data.items || data.status)) {
    throw badRequest('This quotation was already converted to an invoice. Edit the invoice instead.')
  }
  if (data.customerId && data.customerId !== quotation.customerId) await assertCustomerInOrg(orgId, data.customerId)
  if (data.currency) assertCurrencyAllowed(ctx, data.currency, quotation.currency)

  const totals = data.items
    ? computeTotals({
        items: data.items,
        taxRate: data.taxRate ?? quotation.taxRate,
        discount: data.discount ?? quotation.discount,
        taxInclusive: data.taxInclusive ?? quotation.taxInclusive,
      })
    : {}

  const updated = await prisma.quotation.update({
    where: { id },
    data: {
      ...(data.customerId && { customerId: data.customerId }),
      ...(data.validUntil && { validUntil: new Date(data.validUntil) }),
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

  if (data.status === 'ACCEPTED' && quotation.status !== 'ACCEPTED') {
    await notify({
      organizationId: orgId,
      type: 'quotation.accepted',
      permission: 'quotation.view',
      title: `${quotation.quotationNumber} was accepted`,
      body: 'Convert it to an invoice when you are ready.',
      link: `/quotations/${id}`,
    })
  }

  await audit({
    organizationId: orgId,
    userId: ctx.user.id,
    action: 'quotation.updated',
    entityType: 'quotation',
    entityId: id,
    metadata: { quotationNumber: quotation.quotationNumber, fields: Object.keys(data) },
  })
  return updated
})

export const DELETE = route<Params>(async (_request, { params }) => {
  const { id } = await params
  const ctx = await requireOrganization({ permission: 'quotation.delete', write: true })
  const quotation = await findQuotation(ctx.organization.id, id)

  await prisma.quotation.delete({ where: { id } })
  await audit({
    organizationId: ctx.organization.id,
    userId: ctx.user.id,
    action: 'quotation.deleted',
    entityType: 'quotation',
    entityId: id,
    metadata: { quotationNumber: quotation.quotationNumber },
  })
  return { id }
})
