import { prisma } from '@/lib/prisma'
import { route } from '@/lib/server/api'
import { requireOrganization, requirePermission } from '@/lib/server/context'
import { badRequest, notFound } from '@/lib/server/errors'
import { checkUsageLimit } from '@/lib/server/subscription'
import { audit } from '@/lib/server/audit'
import { createWithDocumentNumber } from '@/lib/server/numbering'

type Params = { id: string }

/** Converts a quotation into a new invoice, copying every line item. */
export const POST = route<Params>(async (_request, { params }) => {
  const { id } = await params
  const ctx = await requireOrganization({ permission: 'quotation.convert', write: true })
  requirePermission(ctx, 'invoice.create')
  const orgId = ctx.organization.id

  const quotation = await prisma.quotation.findFirst({
    where: { id, organizationId: orgId },
    include: { items: true, invoice: { select: { id: true } } },
  })
  if (!quotation) throw notFound('Quotation')
  if (quotation.convertedToInvoice || quotation.invoice) {
    throw badRequest('This quotation has already been converted to an invoice.')
  }

  await checkUsageLimit(ctx, 'invoices')

  const now = new Date()
  const dueDate = new Date(now.getTime() + ctx.organization.paymentTermsDays * 24 * 60 * 60 * 1000)

  const invoice = await createWithDocumentNumber(orgId, 'invoice', async (tx, invoiceNumber) => {
    // Guard against a concurrent conversion inside the same transaction.
    const claimed = await tx.quotation.updateMany({
      where: { id, organizationId: orgId, convertedToInvoice: false },
      data: { status: 'CONVERTED', convertedToInvoice: true },
    })
    if (claimed.count === 0) throw badRequest('This quotation has already been converted to an invoice.')

    return tx.invoice.create({
      data: {
        organizationId: orgId,
        invoiceNumber,
        customerId: quotation.customerId,
        userId: ctx.user.id,
        quotationId: quotation.id,
        issueDate: now,
        dueDate,
        notes: quotation.notes,
        currency: quotation.currency,
        salesperson: quotation.salesperson,
        completionDays: quotation.completionDays,
        taxRate: quotation.taxRate,
        taxInclusive: quotation.taxInclusive,
        discount: quotation.discount,
        subtotal: quotation.subtotal,
        taxAmount: quotation.taxAmount,
        discountAmount: quotation.discountAmount,
        total: quotation.total,
        items: {
          create: quotation.items.map((item) => ({
            code: item.code,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
          })),
        },
      },
      select: { id: true, invoiceNumber: true },
    })
  })

  await audit({
    organizationId: orgId,
    userId: ctx.user.id,
    action: 'quotation.converted',
    entityType: 'quotation',
    entityId: id,
    metadata: { quotationNumber: quotation.quotationNumber, invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber },
  })
  return { invoice }
})
