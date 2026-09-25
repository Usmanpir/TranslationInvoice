import 'server-only'
import { cache } from 'react'
import { getServerSession } from 'next-auth'
import type { Membership, Organization, Subscription, User } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission, permissionsFor, type Permission } from '@/lib/permissions'
import { ApiError, forbidden, unauthorized } from './errors'
import { resolveEntitlements, syncExpiredTrial, type Entitlements } from './subscription'

/**
 * Every tenant-scoped handler starts here. Identity, organization, role and
 * subscription are always derived from the session + database — never from
 * anything the client sends.
 */

export type CurrentUser = Pick<
  User,
  'id' | 'name' | 'email' | 'phone' | 'isSuperAdmin' | 'tokenVersion' | 'lastOrganizationId' | 'locale' | 'timezone' | 'dateFormat' | 'createdAt'
>

export interface OrgContext {
  user: CurrentUser
  membership: Membership
  organization: Organization
  subscription: Subscription | null
  entitlements: Entitlements
  role: Membership['role']
  can: (permission: Permission) => boolean
}

const userSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  isSuperAdmin: true,
  tokenVersion: true,
  lastOrganizationId: true,
  locale: true,
  timezone: true,
  dateFormat: true,
  createdAt: true,
} as const

/** The signed-in user, or null. Sessions issued before a "log out everywhere" are rejected. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getServerSession(authOptions)
  const id = session?.user?.id
  if (!id) return null
  const user = await prisma.user.findUnique({ where: { id }, select: userSelect })
  if (!user) return null
  if ((session.user.tokenVersion ?? 0) !== user.tokenVersion) return null
  return user
})

export async function requireAuth(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) throw unauthorized()
  return user
}

export async function requireSuperAdmin(): Promise<CurrentUser> {
  const user = await requireAuth()
  if (!user.isSuperAdmin) throw forbidden('Platform administrator access required.')
  return user
}

/** Resolves the user's active organization (last used, else their oldest membership). */
export const getOrgContext = cache(async (): Promise<OrgContext | null> => {
  const user = await getCurrentUser()
  if (!user) return null

  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    include: { organization: { include: { subscription: true } } },
    orderBy: { createdAt: 'asc' },
  })
  if (memberships.length === 0) return null

  const active = memberships.find((m) => m.organizationId === user.lastOrganizationId) ?? memberships[0]
  const { organization: orgWithSub, ...membership } = active
  const { subscription: rawSub, ...organization } = orgWithSub

  const subscription = await syncExpiredTrial(organization.id, rawSub)
  const entitlements = resolveEntitlements(subscription, organization)

  return {
    user,
    membership,
    organization,
    subscription,
    entitlements,
    role: membership.role,
    can: (permission) => hasPermission(membership.role, permission),
  }
})

interface RequireOrgOptions {
  permission?: Permission
  /** Reject when the organization/subscription is suspended (default for mutations). */
  write?: boolean
}

const DEMO_USERS = (process.env.DEMO_USER_EMAILS || 'demo@invoiceflow.com,sales@invoiceflow.com,accounts@invoiceflow.com')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

/** Shared demo logins must not be able to change their password or profile (it would lock others out). */
export function assertNotDemoUser(user: Pick<CurrentUser, 'email'>) {
  if (DEMO_USERS.includes(user.email.toLowerCase())) {
    throw forbidden('Account changes are disabled for the shared demo login. Start a free trial to get your own account.')
  }
}

/** The public demo workspace (seeded). Anyone can sign into it, so account-level changes are locked. */
export const DEMO_ORGANIZATION_ID = process.env.DEMO_ORGANIZATION_ID || 'org_demo_company'
const DEMO_LOCKED: Permission[] = ['team.manage', 'billing.manage', 'settings.manage', 'organization.delete']

export async function requireOrganization(opts: RequireOrgOptions = {}): Promise<OrgContext> {
  const ctx = await getOrgContext()
  if (!ctx) {
    if (!(await getCurrentUser())) throw unauthorized()
    throw new ApiError('NO_ORGANIZATION', 'You are not a member of any workspace yet.')
  }
  if (opts.permission) requirePermission(ctx, opts.permission)
  if (opts.write) assertWritable(ctx)
  if (opts.write && opts.permission && ctx.organization.id === DEMO_ORGANIZATION_ID && DEMO_LOCKED.includes(opts.permission)) {
    throw forbidden('This is disabled in the demo workspace. Start a free trial to try it with your own business.')
  }
  return ctx
}

export function requirePermission(ctx: OrgContext, permission: Permission) {
  if (!ctx.can(permission)) throw forbidden("Your role doesn't allow this action. Ask a workspace admin for access.")
}

export function assertWritable(ctx: OrgContext) {
  if (ctx.entitlements.readOnly) {
    throw new ApiError(
      'ORGANIZATION_SUSPENDED',
      'This workspace is suspended. Your data is safe, but changes are disabled. Please contact support.'
    )
  }
}

/** Serializable subset for client components (no secrets, no raw rows). */
export function toClientWorkspace(ctx: OrgContext) {
  const { organization: o, entitlements: e } = ctx
  return {
    user: {
      id: ctx.user.id,
      name: ctx.user.name,
      email: ctx.user.email,
      isSuperAdmin: ctx.user.isSuperAdmin,
    },
    organization: {
      id: o.id,
      name: o.name,
      logoUrl: o.logoUploadId ? `/api/files/${o.logoUploadId}` : null,
      primaryColor: o.primaryColor,
      defaultCurrency: o.defaultCurrency,
      defaultTaxRate: o.defaultTaxRate,
      taxInclusive: o.taxInclusive,
      taxLabel: o.taxLabel,
      paymentTermsDays: o.paymentTermsDays,
      defaultNotes: o.defaultNotes,
      onboardingCompleted: Boolean(o.onboardingCompletedAt),
      status: o.status,
    },
    role: ctx.role,
    permissions: permissionsFor(ctx.role),
    subscription: {
      planId: e.plan.id,
      planName: e.plan.name,
      subscribedPlanId: e.subscribedPlan.id,
      subscribedPlanName: e.subscribedPlan.name,
      status: e.status,
      isTrial: e.isTrial,
      trialDaysLeft: e.trialDaysLeft,
      trialEnd: e.trialEnd?.toISOString() ?? null,
      currentPeriodEnd: e.currentPeriodEnd?.toISOString() ?? null,
      cancelAtPeriodEnd: e.cancelAtPeriodEnd,
      lapsed: e.lapsed,
      readOnly: e.readOnly,
      features: e.plan.features,
    },
  }
}

export type ClientWorkspace = ReturnType<typeof toClientWorkspace>
