import 'server-only'
import crypto from 'crypto'
import type { Membership, MembershipRole } from '@prisma/client'
import { forbidden } from './errors'
import type { OrgContext } from './context'

export const INVITATION_TTL_DAYS = 7

export function newInvitationToken() {
  const token = crypto.randomBytes(32).toString('base64url')
  return { token, tokenHash: hashToken(token) }
}

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Who may change whom:
 * - nobody changes or removes the owner (ownership transfer is a separate flow),
 * - nobody changes their own role,
 * - only the owner can grant, change or remove admins.
 */
export function assertCanManageMember(ctx: OrgContext, target: Pick<Membership, 'userId' | 'role'>, nextRole?: MembershipRole) {
  if (target.role === 'OWNER') throw forbidden("The workspace owner's access can't be changed.")
  if (target.userId === ctx.user.id) throw forbidden("You can't change your own role.")
  const touchesAdmin = target.role === 'ADMIN' || nextRole === 'ADMIN'
  if (touchesAdmin && ctx.role !== 'OWNER') throw forbidden('Only the workspace owner can manage admins.')
  if (nextRole === 'OWNER') throw forbidden('Ownership transfer is not available here.')
}

export function assertCanInviteRole(ctx: OrgContext, role: MembershipRole) {
  if (role === 'OWNER') throw forbidden('You cannot invite another owner.')
  if (role === 'ADMIN' && ctx.role !== 'OWNER') throw forbidden('Only the workspace owner can invite admins.')
}
