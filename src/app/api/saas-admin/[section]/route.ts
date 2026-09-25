import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { route, parsePagination, paginated } from '@/lib/server/api'
import { requireSuperAdmin } from '@/lib/server/context'
import { notFound } from '@/lib/server/errors'
import { availableProviders } from '@/lib/server/billing'

type Params = { section: string }

/** GET /api/saas-admin/users | subscriptions | billing | audit | system */
export const GET = route<Params>(async (request, { params }) => {
  await requireSuperAdmin()
  const { section } = await params
  const url = new URL(request.url)
  const p = parsePagination(url, { defaultLimit: 25 })
  const search = (url.searchParams.get('search') || '').trim().slice(0, 100)

  switch (section) {
    case 'users': {
      const where: Prisma.UserWhereInput = search
        ? { OR: [{ email: { contains: search, mode: 'insensitive' } }, { name: { contains: search, mode: 'insensitive' } }] }
        : {}
      const [items, total] = await Promise.all([
        prisma.user.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: p.skip,
          take: p.limit,
          select: {
            id: true,
            name: true,
            email: true,
            isSuperAdmin: true,
            createdAt: true,
            memberships: { select: { role: true, organization: { select: { id: true, name: true } } } },
          },
        }),
        prisma.user.count({ where }),
      ])
      return paginated(items, total, p)
    }
    case 'subscriptions': {
      const status = url.searchParams.get('status')
      const where: Prisma.SubscriptionWhereInput = {
        ...(status && { status: status as any }),
        ...(search && { organization: { name: { contains: search, mode: 'insensitive' } } }),
      }
      const [items, total] = await Promise.all([
        prisma.subscription.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          skip: p.skip,
          take: p.limit,
          include: { organization: { select: { id: true, name: true, status: true } } },
        }),
        prisma.subscription.count({ where }),
      ])
      return paginated(items, total, p)
    }
    case 'billing': {
      const [pending, payments, events] = await Promise.all([
        prisma.billingPayment.findMany({
          where: { provider: 'MANUAL', status: 'PENDING' },
          orderBy: { createdAt: 'asc' },
          include: { organization: { select: { id: true, name: true } } },
        }),
        prisma.billingPayment.findMany({
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: { organization: { select: { id: true, name: true } } },
        }),
        prisma.billingEvent.findMany({
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: { id: true, provider: true, eventId: true, type: true, processedAt: true, error: true, createdAt: true, organization: { select: { id: true, name: true } } },
        }),
      ])
      return { pending, payments, events }
    }
    case 'audit': {
      const action = url.searchParams.get('action')
      const where: Prisma.AuditLogWhereInput = { ...(action && { action: { startsWith: action } }) }
      const [items, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: p.skip,
          take: p.limit,
          include: { user: { select: { id: true, name: true, email: true } }, organization: { select: { id: true, name: true } } },
        }),
        prisma.auditLog.count({ where }),
      ])
      return paginated(items, total, p)
    }
    case 'system': {
      // Configuration status only — never secret values.
      return {
        billingProviders: availableProviders(),
        stripe: { secretKey: Boolean(process.env.STRIPE_SECRET_KEY), webhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET) },
        email: { provider: process.env.RESEND_API_KEY ? 'resend' : 'console', from: process.env.EMAIL_FROM || 'InvoiceFlow <onboarding@resend.dev>' },
        cron: { secret: Boolean(process.env.CRON_SECRET) },
        auth: { secret: Boolean(process.env.NEXTAUTH_SECRET), url: process.env.NEXTAUTH_URL || '(auto)' },
        appUrl: process.env.NEXT_PUBLIC_APP_URL || null,
        manualBilling: process.env.MANUAL_BILLING_ENABLED !== 'false',
      }
    }
    default:
      throw notFound('Section')
  }
})
