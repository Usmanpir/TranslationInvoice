import 'server-only'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export type DocumentKind = 'invoice' | 'quotation'

export function formatDocumentNumber(prefix: string, seq: number, padding: number, date = new Date()) {
  return `${prefix}-${date.getFullYear()}-${String(seq).padStart(padding, '0')}`
}

/**
 * Reserves the next number for an organization inside a transaction.
 * The UPDATE ... increment takes a row lock, so concurrent requests serialize.
 */
async function reserveNumber(tx: Prisma.TransactionClient, organizationId: string, kind: DocumentKind, date: Date) {
  const org =
    kind === 'invoice'
      ? await tx.organization.update({
          where: { id: organizationId },
          data: { invoiceNextNumber: { increment: 1 } },
          select: { invoicePrefix: true, invoiceNextNumber: true, numberPadding: true },
        })
      : await tx.organization.update({
          where: { id: organizationId },
          data: { quotationNextNumber: { increment: 1 } },
          select: { quotationPrefix: true, quotationNextNumber: true, numberPadding: true },
        })

  const prefix = 'invoicePrefix' in org ? org.invoicePrefix : org.quotationPrefix
  const next = 'invoiceNextNumber' in org ? org.invoiceNextNumber : org.quotationNextNumber
  return formatDocumentNumber(prefix, next - 1, org.numberPadding, date)
}

function isNumberConflict(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') return false
  const target = (error.meta?.target as string[] | string | undefined) ?? ''
  const t = Array.isArray(target) ? target.join(',') : target
  return t.includes('invoiceNumber') || t.includes('quotationNumber')
}

/**
 * Creates a document with a fresh sequential number. If the number is already taken
 * (e.g. the starting number was changed to overlap old documents) it skips forward.
 */
export async function createWithDocumentNumber<T>(
  organizationId: string,
  kind: DocumentKind,
  create: (tx: Prisma.TransactionClient, number: string) => Promise<T>,
  opts: { date?: Date; maxAttempts?: number } = {}
): Promise<T> {
  const attempts = opts.maxAttempts ?? 5
  for (let i = 0; i < attempts; i++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const number = await reserveNumber(tx, organizationId, kind, opts.date ?? new Date())
        return create(tx, number)
      })
    } catch (error) {
      if (isNumberConflict(error) && i < attempts - 1) {
        // The transaction rolled back the increment; bump outside it so the next try moves on.
        await prisma.organization.update({
          where: { id: organizationId },
          data: kind === 'invoice' ? { invoiceNextNumber: { increment: 1 } } : { quotationNextNumber: { increment: 1 } },
        })
        continue
      }
      throw error
    }
  }
  throw new Error('Could not allocate a document number')
}
