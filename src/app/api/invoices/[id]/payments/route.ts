import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { route, parseJson } from '@/lib/server/api'
import { requireOrganization } from '@/lib/server/context'
import { badRequest, notFound } from '@/lib/server/errors'
import { requireFeature } from '@/lib/server/subscription'
import { audit } from '@/lib/server/audit'
import { notify } from '@/lib/server/notifications'
import { sendEmail, appUrl } from '@/lib/server/email'
import { resolveOwnedUploadUrl } from '@/lib/server/invoices'
import { dateString } from '@/lib/server/documents'
import { formatCurrency } from '@/lib/utils'

type Params = { id: string }

const paymentSchema = z.object({
  method: z.enum(['BANK_TRANSFER', 'CASH', 'CHEQUE', 'CARD', 'PAYPAL', 'OTHER']).default('BANK_TRANSFER'),
  reference: z.string().trim().max(200).optional().transform((v) => v || null),
  notes: z.string().trim().max(1000).optional().transform((v) => v || null),
  paidAt: dateString.optional(),
  proofUrl: z.string().max(300).optional().nullable(),
})

/** Marks the invoice paid in full and records the payment. */
export const POST = route<Params>(async (request, { params }) => {
  const { id } = await params
  const ctx = await requireOrganization({ permission: 'payment.manage', write: true })
  const orgId = ctx.organization.id
  const invoice = await prisma.invoice.findFirst({ where: { id, organizationId: orgId } })
  if (!invoice) throw notFound('Invoice')
  if (invoice.status === 'PAID') throw badRequest('This invoice is already marked as paid.')
  if (invoice.status === 'CANCELLED') throw badRequest('Cancelled invoices cannot be paid. Reopen it first.')

  const data = await parseJson(request, paymentSchema)
  let proofUrl: string | null = null
  if (data.proofUrl) {
    requireFeature(ctx, 'paymentProofs')
    proofUrl = await resolveOwnedUploadUrl(orgId, data.proofUrl)
    if (!proofUrl) throw badRequest('The payment proof file could not be found. Please upload it again.')
  }

  const paidAt = data.paidAt ? new Date(data.paidAt) : new Date()
  const [payment] = await prisma.$transaction([
    prisma.payment.create({
      data: {
        organizationId: orgId,
        invoiceId: id,
        amount: invoice.total,
        currency: invoice.currency,
        method: data.method,
        reference: data.reference,
        notes: data.notes,
        proofUrl,
        paidAt,
        recordedById: ctx.user.id,
      },
    }),
    prisma.invoice.update({ where: { id }, data: { status: 'PAID', paidAt, paymentProof: proofUrl } }),
  ])

  await audit({
    organizationId: orgId,
    userId: ctx.user.id,
    action: 'invoice.marked_paid',
    entityType: 'invoice',
    entityId: id,
    metadata: { invoiceNumber: invoice.invoiceNumber, amount: invoice.total, method: data.method },
  })

  const amount = formatCurrency(invoice.total, invoice.currency)
  const emailTo = await notify({
    organizationId: orgId,
    type: 'invoice.paid',
    permission: 'payment.view',
    title: `${invoice.invoiceNumber} was paid`,
    body: amount,
    link: `/invoices/${id}`,
  })
  const others = emailTo.filter((r) => r.email !== ctx.user.email)
  if (others.length > 0) {
    await sendEmail(others.map((r) => r.email), 'paymentReceived', {
      invoiceNumber: invoice.invoiceNumber,
      amount,
      url: appUrl(`/invoices/${id}`),
    })
  }

  return payment
})

/** Marks the invoice unpaid again, removing its payment records. */
export const DELETE = route<Params>(async (_request, { params }) => {
  const { id } = await params
  const ctx = await requireOrganization({ permission: 'payment.manage', write: true })
  const invoice = await prisma.invoice.findFirst({ where: { id, organizationId: ctx.organization.id } })
  if (!invoice) throw notFound('Invoice')
  if (invoice.status !== 'PAID') throw badRequest('This invoice is not marked as paid.')

  const overdue = invoice.dueDate < new Date(new Date().setHours(0, 0, 0, 0))
  await prisma.$transaction([
    prisma.payment.deleteMany({ where: { invoiceId: id, organizationId: ctx.organization.id } }),
    prisma.invoice.update({
      where: { id },
      data: { status: overdue ? 'OVERDUE' : 'PENDING', paidAt: null, paymentProof: null },
    }),
  ])

  await audit({
    organizationId: ctx.organization.id,
    userId: ctx.user.id,
    action: 'invoice.marked_unpaid',
    entityType: 'invoice',
    entityId: id,
    metadata: { invoiceNumber: invoice.invoiceNumber },
  })
  return { id }
})
