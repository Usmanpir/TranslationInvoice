import 'server-only'
import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/utils'
import { notify } from './notifications'
import { sendEmail, appUrl } from './email'

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Moves unpaid invoices past their due date to OVERDUE and notifies the team once.
 * Called lazily from list/dashboard reads, so no background job is required.
 */
export async function syncOverdueInvoices(organizationId: string) {
  const due = await prisma.invoice.findMany({
    where: { organizationId, status: 'PENDING', dueDate: { lt: startOfToday() } },
    select: { id: true, invoiceNumber: true, total: true, currency: true, customer: { select: { name: true } } },
    take: 100,
  })
  if (due.length === 0) return

  const { count } = await prisma.invoice.updateMany({
    where: { id: { in: due.map((d) => d.id) }, status: 'PENDING' },
    data: { status: 'OVERDUE' },
  })
  if (count === 0) return

  for (const inv of due.slice(0, 20)) {
    const amount = formatCurrency(inv.total, inv.currency)
    const emailTo = await notify({
      organizationId,
      type: 'invoice.overdue',
      permission: 'invoice.view',
      title: `${inv.invoiceNumber} is overdue`,
      body: `${inv.customer.name} · ${amount}`,
      link: `/invoices/${inv.id}`,
    })
    if (emailTo.length > 0) {
      await sendEmail(
        emailTo.map((r) => r.email),
        'invoiceOverdue',
        { invoiceNumber: inv.invoiceNumber, customerName: inv.customer.name, amount, url: appUrl(`/invoices/${inv.id}`) }
      )
    }
  }
}

/** Validates that a payment-proof URL points at an upload owned by the same organization. */
export async function resolveOwnedUploadUrl(organizationId: string, url: string | null | undefined) {
  if (!url) return null
  const match = /^\/api\/files\/([a-z0-9]+)(?:\.[a-z0-9]+)?$/i.exec(url)
  if (!match) return null
  const upload = await prisma.upload.findFirst({ where: { id: match[1], organizationId }, select: { id: true } })
  return upload ? url : null
}
