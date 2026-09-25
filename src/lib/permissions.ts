// Organization-level permissions. Server code checks permissions, never role names,
// so roles can be reshaped later without touching route handlers.
// This module is shared by server and client (for hiding UI), but only the server check is authoritative.

export type MembershipRole = 'OWNER' | 'ADMIN' | 'ACCOUNTANT' | 'SALES' | 'VIEWER'

export const PERMISSIONS = [
  'dashboard.view',
  'customer.view',
  'customer.manage',
  'customer.delete',
  'invoice.view',
  'invoice.create',
  'invoice.edit',
  'invoice.delete',
  'quotation.view',
  'quotation.create',
  'quotation.edit',
  'quotation.delete',
  'quotation.convert',
  'payment.view',
  'payment.manage',
  'report.view',
  'export.data',
  'team.view',
  'team.manage',
  'billing.view',
  'billing.manage',
  'settings.view',
  'settings.manage',
  'audit.view',
  'organization.delete',
] as const

export type Permission = (typeof PERMISSIONS)[number]

const VIEW: Permission[] = [
  'dashboard.view',
  'customer.view',
  'invoice.view',
  'quotation.view',
  'payment.view',
]

const SALES: Permission[] = [
  ...VIEW,
  'customer.manage',
  'invoice.create',
  'invoice.edit',
  'quotation.create',
  'quotation.edit',
  'quotation.delete',
  'quotation.convert',
]

const ACCOUNTANT: Permission[] = [
  ...SALES,
  'customer.delete',
  'invoice.delete',
  'payment.manage',
  'report.view',
  'export.data',
  'settings.view',
]

const ADMIN: Permission[] = PERMISSIONS.filter((p) => p !== 'organization.delete')

export const ROLE_PERMISSIONS: Record<MembershipRole, ReadonlySet<Permission>> = {
  OWNER: new Set(PERMISSIONS),
  ADMIN: new Set(ADMIN),
  ACCOUNTANT: new Set(ACCOUNTANT),
  SALES: new Set(SALES),
  VIEWER: new Set(VIEW),
}

export function hasPermission(role: MembershipRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false
}

export function permissionsFor(role: MembershipRole): Permission[] {
  return Array.from(ROLE_PERMISSIONS[role] ?? [])
}

export const ROLE_LABELS: Record<MembershipRole, { label: string; description: string }> = {
  OWNER: { label: 'Owner', description: 'Full access, including billing and deleting the workspace.' },
  ADMIN: { label: 'Admin', description: 'Manages the team, settings, billing and all documents.' },
  ACCOUNTANT: { label: 'Accountant', description: 'Invoices, quotations, customers, payments and reports.' },
  SALES: { label: 'Sales', description: 'Customers, quotations and invoices.' },
  VIEWER: { label: 'Viewer', description: 'Read-only access to documents and customers.' },
}

/** Roles an inviter may assign. Only owners can create other admins' peers at the top. */
export const ASSIGNABLE_ROLES: MembershipRole[] = ['ADMIN', 'ACCOUNTANT', 'SALES', 'VIEWER']
