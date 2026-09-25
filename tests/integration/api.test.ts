/**
 * End-to-end API tests. Requires the dev server (`npm run dev -- -p 3100`) running against the
 * LOCAL database from .env.local. Run with: npm run test:integration
 */
import { createHash } from 'crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Client, addMember, invoiceBody, prisma, registerOrg, resetSignupThrottle, superAdmin } from './helpers'

const year = new Date().getFullYear()

let A: Awaited<ReturnType<typeof registerOrg>>
let B: Awaited<ReturnType<typeof registerOrg>>
let customerA: string
let invoiceA: string

beforeAll(async () => {
  A = await registerOrg('alpha')
  B = await registerOrg('beta')
  const c = await A.client.req('/api/customers', { json: { name: 'Client One', email: 'one@client.test', phone: '+971500000000' } })
  customerA = c.json.data.id
  const inv = await A.client.req('/api/invoices', { json: invoiceBody(customerA) })
  invoiceA = inv.json.data.id
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('authentication', () => {
  it('rejects anonymous API access with the standard error shape', async () => {
    const r = await new Client().req('/api/invoices')
    expect(r.status).toBe(401)
    expect(r.json).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } })
  })

  it('registration creates an owner, a workspace and a trial', async () => {
    const org = await prisma.organization.findUnique({ where: { id: A.organizationId }, include: { subscription: true, memberships: true } })
    expect(org?.memberships[0].role).toBe('OWNER')
    expect(org?.subscription).toMatchObject({ status: 'TRIALING', plan: 'professional' })
  })

  it('rejects wrong passwords', async () => {
    await expect(new Client().login(A.email, 'wrong-password1')).rejects.toThrow()
  })

  it('logging out everywhere invalidates existing sessions', async () => {
    const tmp = await registerOrg('logout')
    expect((await tmp.client.req('/api/customers')).status).toBe(200)
    await tmp.client.req('/api/profile/sessions', { method: 'DELETE' })
    expect((await tmp.client.req('/api/customers')).status).toBe(401)
  })

  it('password reset works once, revokes sessions and never reveals whether an email exists', async () => {
    const org = await registerOrg('reset')
    const unknown = await new Client().req('/api/auth/password-reset', { json: { email: 'nobody.here@test.local' } })
    const known = await new Client().req('/api/auth/password-reset', { json: { email: org.email } })
    expect(unknown.json).toEqual(known.json)

    const token = `test-token-${Date.now()}-abcdefghijklmnop`
    const user = await prisma.user.findUniqueOrThrow({ where: { email: org.email } })
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 60_000) },
    })
    const reset = await new Client().req('/api/auth/password-reset', { method: 'PUT', json: { token, password: 'newsecret456' } })
    expect(reset.json.success).toBe(true)
    expect((await org.client.req('/api/customers')).status).toBe(401)
    await new Client().login(org.email, 'newsecret456')
    const reuse = await new Client().req('/api/auth/password-reset', { method: 'PUT', json: { token, password: 'another789x' } })
    expect(reuse.status).toBe(400)
  })

  it('throttles repeated signups from the same IP', async () => {
    await resetSignupThrottle()
    const anon = new Client()
    const attempt = (i: number) =>
      anon.req('/api/auth/register', { json: { name: 'Spam Bot', email: `spam${i}.${Date.now()}@test.local`, password: 'secret123', companyName: 'Spam Co' } })
    for (let i = 0; i < 5; i++) expect((await attempt(i)).status).toBe(200)
    const blocked = await attempt(6)
    expect(blocked.status).toBe(429)
    expect(blocked.json.error.code).toBe('RATE_LIMITED')
    await resetSignupThrottle()
  })

  it('blocks cross-site state-changing requests', async () => {
    const r = await A.client.req('/api/customers', { json: { name: 'x', email: 'x@x.test', phone: '1' }, headers: { origin: 'https://evil.example' } })
    expect(r.status).toBe(403)
  })
})

describe('multi-tenancy', () => {
  it('Organization B cannot list, read, edit or delete Organization A data', async () => {
    expect((await B.client.req('/api/invoices')).json.data.items).toHaveLength(0)
    expect((await B.client.req(`/api/invoices/${invoiceA}`)).status).toBe(404)
    expect((await B.client.req(`/api/invoices/${invoiceA}`, { method: 'PUT', json: { notes: 'x' } })).status).toBe(404)
    expect((await B.client.req(`/api/invoices/${invoiceA}`, { method: 'DELETE' })).status).toBe(404)
    expect((await B.client.req(`/api/customers/${customerA}`)).status).toBe(404)
    expect((await B.client.req(`/api/invoices/${invoiceA}/payments`, { json: {} })).status).toBe(404)
  })

  it('Organization A cannot attach Organization B customers to its documents', async () => {
    const bc = await B.client.req('/api/customers', { json: { name: 'B client', email: 'b@b.test', phone: '1' } })
    const r = await A.client.req('/api/invoices', { json: invoiceBody(bc.json.data.id) })
    expect(r.status).toBe(404)
  })

  it('ignores organizationId sent by the client', async () => {
    const r = await B.client.req('/api/customers', { json: { name: 'Sneaky', email: 's@s.test', phone: '1', organizationId: A.organizationId } })
    const row = await prisma.customer.findUnique({ where: { id: r.json.data.id } })
    expect(row?.organizationId).toBe(B.organizationId)
  })

  it('files are only served to members of the owning workspace', async () => {
    const form = new FormData()
    const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da6360f8cf00000301010018dd8db00000000049454e44ae426082', 'hex')
    form.append('file', new Blob([png], { type: 'image/png' }), 'proof.png')
    form.append('purpose', 'PAYMENT_PROOF')
    const up = await A.client.req('/api/upload', { body: form })
    expect(up.json.success).toBe(true)
    expect((await A.client.req(up.json.data.url)).status).toBe(200)
    expect((await B.client.req(up.json.data.url)).status).toBe(404)
  })

  it('rejects files whose content does not match their type', async () => {
    const form = new FormData()
    form.append('file', new Blob([Buffer.from('MZ fake exe')], { type: 'image/png' }), 'evil.png')
    const r = await A.client.req('/api/upload', { body: form })
    expect(r.status).toBe(400)
  })
})

describe('permissions', () => {
  it('admin manages the team but cannot promote to admin (owner only)', async () => {
    const admin = await addMember(A.organizationId, 'ADMIN')
    expect((await admin.req('/api/team/invitations', { json: { email: `x${Date.now()}@t.local`, role: 'SALES' } })).json.success).toBe(true)
    expect((await admin.req('/api/team/invitations', { json: { email: `y${Date.now()}@t.local`, role: 'ADMIN' } })).status).toBe(403)
  })

  it('accountant records payments and exports but cannot manage team or billing', async () => {
    const acc = await addMember(A.organizationId, 'ACCOUNTANT')
    const inv = await acc.req('/api/invoices', { json: invoiceBody(customerA) })
    expect(inv.json.success).toBe(true)
    expect((await acc.req(`/api/invoices/${inv.json.data.id}/payments`, { json: { method: 'CASH' } })).json.success).toBe(true)
    expect((await acc.req('/api/team/invitations', { json: { email: 'z@t.local', role: 'VIEWER' } })).status).toBe(403)
    expect((await acc.req('/api/billing/checkout', { json: { plan: 'starter' } })).status).toBe(403)
  })

  it('sales creates documents but cannot delete invoices or mark them paid', async () => {
    const sales = await addMember(A.organizationId, 'SALES')
    const inv = await sales.req('/api/invoices', { json: invoiceBody(customerA) })
    expect(inv.json.success).toBe(true)
    expect((await sales.req(`/api/invoices/${inv.json.data.id}`, { method: 'DELETE' })).status).toBe(403)
    expect((await sales.req(`/api/invoices/${inv.json.data.id}/payments`, { json: {} })).status).toBe(403)
  })

  it('viewer is read-only', async () => {
    const viewer = await addMember(A.organizationId, 'VIEWER')
    expect((await viewer.req('/api/invoices')).json.success).toBe(true)
    expect((await viewer.req('/api/customers', { json: { name: 'n', email: 'n@n.test', phone: '1' } })).status).toBe(403)
    expect((await viewer.req('/api/organization', { method: 'PUT', json: { name: 'Hacked' } })).status).toBe(403)
  })

  it('regular users cannot reach the SaaS admin API', async () => {
    expect((await A.client.req('/api/saas-admin/overview')).status).toBe(403)
  })
})

describe('invoices and quotations', () => {
  it('numbers invoices sequentially per organization, even concurrently', async () => {
    const org = await registerOrg('numbers')
    const c = await org.client.req('/api/customers', { json: { name: 'N', email: 'n@n.test', phone: '1' } })
    const results = await Promise.all([1, 2, 3].map(() => org.client.req('/api/invoices', { json: invoiceBody(c.json.data.id) })))
    const numbers = results.map((r) => r.json.data.invoiceNumber).sort()
    expect(numbers).toEqual([`INV-${year}-0001`, `INV-${year}-0002`, `INV-${year}-0003`])
  })

  it('computes totals on the server', async () => {
    const r = await A.client.req('/api/invoices', { json: invoiceBody(customerA, { items: [{ description: 'x', quantity: 3, unitPrice: 100 }], discount: 10 }) })
    expect(r.json.data).toMatchObject({ subtotal: 300, discountAmount: 30, taxAmount: 13.5, total: 283.5 })
  })

  it('edits, marks paid, marks unpaid and deletes an invoice', async () => {
    const created = await A.client.req('/api/invoices', { json: invoiceBody(customerA) })
    const id = created.json.data.id
    const edited = await A.client.req(`/api/invoices/${id}`, { method: 'PUT', json: { items: [{ description: 'Edited', quantity: 1, unitPrice: 1000 }] } })
    expect(edited.json.data.total).toBe(1050)
    expect((await A.client.req(`/api/invoices/${id}/payments`, { json: { method: 'BANK_TRANSFER', reference: 'TRX1' } })).json.data.amount).toBe(1050)
    expect((await A.client.req(`/api/invoices/${id}`)).json.data.status).toBe('PAID')
    await A.client.req(`/api/invoices/${id}/payments`, { method: 'DELETE' })
    expect((await A.client.req(`/api/invoices/${id}`)).json.data.status).toBe('PENDING')
    expect((await A.client.req(`/api/invoices/${id}`, { method: 'DELETE' })).json.success).toBe(true)
  })

  it('returns everything the PDF needs (issuer, customer, items)', async () => {
    const r = await A.client.req(`/api/invoices/${invoiceA}`)
    expect(r.json.data.issuer).toMatchObject({ name: 'alpha Co', taxLabel: 'VAT' })
    expect(r.json.data.items.length).toBeGreaterThan(0)
    expect(r.json.data.customer.name).toBe('Client One')
  })

  it('creates, edits and converts a quotation exactly once', async () => {
    const q = await A.client.req('/api/quotations', { json: { ...invoiceBody(customerA), dueDate: undefined, validUntil: '2030-01-01' } })
    expect(q.json.data.quotationNumber).toMatch(/^QUO-\d{4}-\d{4}$/)
    const edited = await A.client.req(`/api/quotations/${q.json.data.id}`, { method: 'PUT', json: { items: [{ description: 'v2', quantity: 4, unitPrice: 50 }] } })
    expect(edited.json.data.total).toBe(210)
    const conv = await A.client.req(`/api/quotations/${q.json.data.id}/convert`, { method: 'POST' })
    expect(conv.json.data.invoice.invoiceNumber).toMatch(/^INV-/)
    expect((await A.client.req(`/api/quotations/${q.json.data.id}/convert`, { method: 'POST' })).status).toBe(400)
  })
})

describe('billing', () => {
  it('trial expiry falls back to Free limits without deleting data', async () => {
    const org = await registerOrg('expiring')
    await prisma.subscription.update({ where: { organizationId: org.organizationId }, data: { trialEnd: new Date(Date.now() - 1000) } })
    const billing = await org.client.req('/api/billing')
    expect(billing.json.data.current).toMatchObject({ status: 'EXPIRED', planId: 'free', lapsed: true })
    // Premium features are locked, core invoicing still works.
    expect((await org.client.req('/api/reports')).json.error.code).toBe('FEATURE_UNAVAILABLE')
    const c = await org.client.req('/api/customers', { json: { name: 'Still works', email: 's@w.test', phone: '1' } })
    expect(c.json.success).toBe(true)
  })

  it('enforces monthly limits with upgrade details', async () => {
    const org = await registerOrg('limits')
    await prisma.subscription.update({ where: { organizationId: org.organizationId }, data: { plan: 'free', status: 'ACTIVE', trialEnd: null } })
    const c = await org.client.req('/api/customers', { json: { name: 'L', email: 'l@l.test', phone: '1' } })
    let last
    for (let i = 0; i < 11; i++) last = await org.client.req('/api/invoices', { json: invoiceBody(c.json.data.id) })
    expect(last!.status).toBe(402)
    expect(last!.json.error).toMatchObject({ code: 'LIMIT_REACHED', details: { resource: 'invoices', used: 10, limit: 10, suggestedPlan: 'starter' } })
  })

  it('upgrade via bank transfer activates only after a SaaS admin confirms it', async () => {
    const org = await registerOrg('upgrade')
    const checkout = await org.client.req('/api/billing/checkout', { json: { plan: 'business', interval: 'YEAR', provider: 'MANUAL' } })
    expect(checkout.json.data.kind).toBe('pending')
    // Nothing changes until payment is confirmed server-side.
    expect((await org.client.req('/api/billing')).json.data.current.subscribedPlanId).toBe('professional')

    const root = await superAdmin()
    const pending = await root.req('/api/saas-admin/billing')
    const request = pending.json.data.pending.find((p: any) => p.organization.id === org.organizationId)
    expect(request).toBeTruthy()
    await root.req(`/api/saas-admin/organizations/${org.organizationId}`, { json: { action: 'confirm_payment', paymentId: request.id } })

    const after = (await org.client.req('/api/billing')).json.data.current
    expect(after).toMatchObject({ subscribedPlanId: 'business', status: 'ACTIVE', provider: 'MANUAL' })
    const audit = await prisma.auditLog.findFirst({ where: { organizationId: org.organizationId, action: 'subscription.changed' }, orderBy: { createdAt: 'desc' } })
    expect(audit).toBeTruthy()
  })

  it('cancels and reactivates a subscription', async () => {
    const org = await registerOrg('cancel')
    await prisma.subscription.update({
      where: { organizationId: org.organizationId },
      data: { plan: 'starter', status: 'ACTIVE', provider: 'MANUAL', trialEnd: null, currentPeriodEnd: new Date(Date.now() + 20 * 86400000) },
    })
    await org.client.req('/api/billing/cancel', { method: 'POST' })
    expect((await org.client.req('/api/billing')).json.data.current.cancelAtPeriodEnd).toBe(true)
    await org.client.req('/api/billing/resume', { method: 'POST' })
    expect((await org.client.req('/api/billing')).json.data.current.cancelAtPeriodEnd).toBe(false)
  })

  it('rejects unsigned Stripe webhooks', async () => {
    const r = await new Client().req('/api/billing/webhook/stripe', { json: { type: 'checkout.session.completed' } })
    expect(r.status).toBe(400)
  })

  it('SaaS admin suspension makes the workspace read-only', async () => {
    const org = await registerOrg('suspend')
    const root = await superAdmin()
    await root.req(`/api/saas-admin/organizations/${org.organizationId}`, { json: { action: 'suspend', reason: 'test' } })
    expect((await org.client.req('/api/customers')).json.success).toBe(true)
    const write = await org.client.req('/api/customers', { json: { name: 'x', email: 'x@x.test', phone: '1' } })
    expect(write.json.error.code).toBe('ORGANIZATION_SUSPENDED')
  })
})
