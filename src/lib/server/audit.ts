import 'server-only'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export type AuditAction =
  | 'member.invited'
  | 'member.joined'
  | 'member.removed'
  | 'member.role_changed'
  | 'invitation.revoked'
  | 'customer.created'
  | 'customer.updated'
  | 'customer.deleted'
  | 'invoice.created'
  | 'invoice.updated'
  | 'invoice.deleted'
  | 'invoice.marked_paid'
  | 'invoice.marked_unpaid'
  | 'quotation.created'
  | 'quotation.updated'
  | 'quotation.deleted'
  | 'quotation.converted'
  | 'settings.updated'
  | 'branding.updated'
  | 'subscription.changed'
  | 'subscription.canceled'
  | 'subscription.resumed'
  | 'organization.created'
  | 'organization.suspended'
  | 'organization.activated'
  | 'organization.deleted'
  | 'organization.trial_extended'
  | 'organization.plan_changed'
  | 'user.password_changed'
  | 'user.sessions_revoked'

interface AuditInput {
  organizationId?: string | null
  userId?: string | null
  action: AuditAction
  entityType?: string
  entityId?: string
  metadata?: Prisma.InputJsonValue
  ipAddress?: string
}

/** Records an audit event. Never throws — auditing must not break the user's action. */
export async function audit(input: AuditInput, tx: Prisma.TransactionClient | typeof prisma = prisma) {
  try {
    await tx.auditLog.create({
      data: {
        organizationId: input.organizationId ?? null,
        userId: input.userId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata,
        ipAddress: input.ipAddress,
      },
    })
  } catch (error) {
    console.error('[audit] failed to record event', input.action, error)
  }
}
