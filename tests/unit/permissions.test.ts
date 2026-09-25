import { describe, expect, it } from 'vitest'
import { hasPermission, PERMISSIONS, type MembershipRole, type Permission } from '@/lib/permissions'

const can = (role: MembershipRole, p: Permission) => hasPermission(role, p)

describe('role permissions', () => {
  it('owner has every permission', () => {
    for (const p of PERMISSIONS) expect(can('OWNER', p)).toBe(true)
  })

  it('admin has everything except deleting the organization', () => {
    for (const p of PERMISSIONS) expect(can('ADMIN', p)).toBe(p !== 'organization.delete')
  })

  it('accountant manages documents, payments and reports but not team, billing or settings', () => {
    for (const p of ['invoice.create', 'invoice.delete', 'payment.manage', 'report.view', 'export.data', 'customer.delete'] as Permission[]) {
      expect(can('ACCOUNTANT', p)).toBe(true)
    }
    for (const p of ['team.manage', 'billing.manage', 'settings.manage', 'audit.view'] as Permission[]) {
      expect(can('ACCOUNTANT', p)).toBe(false)
    }
  })

  it('sales creates and edits documents but cannot delete invoices or record payments', () => {
    expect(can('SALES', 'invoice.create')).toBe(true)
    expect(can('SALES', 'quotation.convert')).toBe(true)
    expect(can('SALES', 'invoice.delete')).toBe(false)
    expect(can('SALES', 'payment.manage')).toBe(false)
    expect(can('SALES', 'report.view')).toBe(false)
  })

  it('viewer is read-only', () => {
    const writes = PERMISSIONS.filter((p) => !p.endsWith('.view'))
    for (const p of writes) expect(can('VIEWER', p)).toBe(false)
    expect(can('VIEWER', 'invoice.view')).toBe(true)
    expect(can('VIEWER', 'team.view')).toBe(false)
  })
})
