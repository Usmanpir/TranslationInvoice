// prisma/seed.ts — idempotent seed for local development and demo environments.
//
//   npm run db:seed            (uses .env.local)
//
// Creates:
//   • a platform super admin      ADMIN_EMAIL / ADMIN_PASSWORD (random password if unset)
//   • the "Demo Company" workspace with owner, salesperson and accountant logins,
//     realistic UAE customers, quotations, invoices (paid / pending / overdue) and payments.
// It only ever touches the demo workspace and the accounts listed here.

import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { PrismaClient, type InvoiceStatus, type QuotationStatus } from '@prisma/client'

const prisma = new PrismaClient()

const DEMO_ORG_ID = 'org_demo_company'
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'demo123456'

const day = 24 * 60 * 60 * 1000
const daysFromNow = (n: number) => new Date(Date.now() + n * day)
const round2 = (n: number) => Math.round(n * 100) / 100

function totals(items: { quantity: number; unitPrice: number }[], taxRate: number, discount = 0) {
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
  const discountAmount = subtotal * (discount / 100)
  const taxAmount = (subtotal - discountAmount) * (taxRate / 100)
  return { subtotal: round2(subtotal), discountAmount: round2(discountAmount), taxAmount: round2(taxAmount), total: round2(subtotal - discountAmount + taxAmount) }
}

async function upsertUser(email: string, name: string, password: string, extra: { isSuperAdmin?: boolean } = {}) {
  const hash = await bcrypt.hash(password, 12)
  return prisma.user.upsert({
    where: { email },
    update: { name, ...extra },
    create: { email, name, password: hash, emailVerified: new Date(), ...extra },
  })
}

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
    throw new Error('Refusing to seed a production database. Set ALLOW_PRODUCTION_SEED=true to override.')
  }

  // ── Platform admin ──────────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@invoiceflow.com'
  const adminPassword = process.env.ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url')
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } })
  const admin = await upsertUser(adminEmail, 'Platform Admin', adminPassword, { isSuperAdmin: true })

  // Admin gets their own internal workspace so the app is usable when signed in.
  if (!(await prisma.membership.findFirst({ where: { userId: admin.id } }))) {
    await prisma.organization.create({
      data: {
        id: 'org_platform_admin',
        name: 'InvoiceFlow HQ',
        slug: 'invoiceflow-hq',
        onboardingCompletedAt: new Date(),
        memberships: { create: { userId: admin.id, role: 'OWNER' } },
        subscription: { create: { plan: 'business', status: 'ACTIVE', provider: 'MANUAL', currentPeriodStart: new Date(), currentPeriodEnd: daysFromNow(3650) } },
      },
    })
    await prisma.user.update({ where: { id: admin.id }, data: { lastOrganizationId: 'org_platform_admin' } })
  }

  // ── Demo workspace ──────────────────────────────────────────────
  const owner = await upsertUser('demo@invoiceflow.com', 'Alex Johnson', DEMO_PASSWORD)
  const sales = await upsertUser('sales@invoiceflow.com', 'Sara Al Mansoori', DEMO_PASSWORD)
  const accountant = await upsertUser('accounts@invoiceflow.com', 'Omar Haddad', DEMO_PASSWORD)

  const existingDemo = await prisma.organization.findUnique({ where: { id: DEMO_ORG_ID } })
  if (existingDemo) {
    // Reset only the demo workspace's business data so the seed stays idempotent.
    await prisma.$transaction([
      prisma.payment.deleteMany({ where: { organizationId: DEMO_ORG_ID } }),
      prisma.invoice.deleteMany({ where: { organizationId: DEMO_ORG_ID } }),
      prisma.quotation.deleteMany({ where: { organizationId: DEMO_ORG_ID } }),
      prisma.customer.deleteMany({ where: { organizationId: DEMO_ORG_ID } }),
      prisma.notification.deleteMany({ where: { organizationId: DEMO_ORG_ID } }),
    ])
  }

  await prisma.organization.upsert({
    where: { id: DEMO_ORG_ID },
    update: { invoiceNextNumber: 1, quotationNextNumber: 1 },
    create: {
      id: DEMO_ORG_ID,
      name: 'Demo Company LLC',
      slug: 'demo-company',
      email: 'accounts@democompany.ae',
      phone: '+971 4 123 4567',
      website: 'https://democompany.ae',
      address: 'Office 1203, Bay Square Building 5\nBusiness Bay, Dubai, UAE',
      country: 'AE',
      taxNumber: '100234567800003',
      defaultTaxRate: 5,
      bankName: 'Emirates NBD',
      bankBranch: 'Business Bay',
      bankAccountName: 'Demo Company LLC',
      bankAccountNumber: '1015 2233 4455 01',
      iban: 'AE070331234567890123456',
      swiftCode: 'EBILAEAD',
      paymentInstructions: 'Please include the invoice number as your payment reference.',
      defaultNotes: 'Payment due within 30 days. Thank you for your business!',
      onboardingCompletedAt: new Date(),
    },
  })

  await prisma.subscription.upsert({
    where: { organizationId: DEMO_ORG_ID },
    update: { plan: 'professional', status: 'ACTIVE', provider: 'MANUAL', currentPeriodEnd: daysFromNow(3650), trialEnd: null },
    create: { organizationId: DEMO_ORG_ID, plan: 'professional', status: 'ACTIVE', provider: 'MANUAL', currentPeriodStart: new Date(), currentPeriodEnd: daysFromNow(3650) },
  })

  for (const [user, role] of [
    [owner, 'OWNER'],
    [sales, 'SALES'],
    [accountant, 'ACCOUNTANT'],
  ] as const) {
    await prisma.membership.upsert({
      where: { userId_organizationId: { userId: user.id, organizationId: DEMO_ORG_ID } },
      update: { role },
      create: { userId: user.id, organizationId: DEMO_ORG_ID, role },
    })
    await prisma.user.update({ where: { id: user.id }, data: { lastOrganizationId: DEMO_ORG_ID } })
  }

  const customers = await Promise.all(
    [
      { name: 'Fatima Al Zaabi', email: 'fatima@alnoortrading.ae', phone: '+971 50 123 4567', company: 'Al Noor Trading LLC', taxNumber: '100345678900003', address: 'Deira, Dubai, UAE' },
      { name: 'James Carter', email: 'james@gulfbuild.ae', phone: '+971 55 987 6543', company: 'Gulf Build Contracting', taxNumber: '100456789000003', address: 'Mussafah, Abu Dhabi, UAE' },
      { name: 'Priya Nair', email: 'priya@oasisdental.ae', phone: '+971 52 222 3344', company: 'Oasis Dental Clinic', address: 'Jumeirah, Dubai, UAE' },
      { name: 'Khalid Rahman', email: 'khalid@desertlogistics.com', phone: '+971 56 111 2233', company: 'Desert Logistics FZE', taxNumber: '100567890100003', address: 'JAFZA, Dubai, UAE' },
      { name: 'Elena Rossi', email: 'elena@milanodesign.eu', phone: '+39 02 1234 5678', company: 'Milano Design Studio', address: 'Via Tortona 31, Milan, Italy' },
      { name: 'Ahmed Hassan', email: 'ahmed@sharjahprint.ae', phone: '+971 6 555 1122', company: 'Sharjah Print House', taxNumber: '100678901200003', address: 'Industrial Area 13, Sharjah, UAE' },
    ].map((c) => prisma.customer.create({ data: { ...c, organizationId: DEMO_ORG_ID, userId: owner.id } }))
  )

  const year = new Date().getFullYear()
  const num = (prefix: string, n: number) => `${prefix}-${year}-${String(n).padStart(4, '0')}`

  const invoices: {
    c: number
    status: InvoiceStatus
    issued: number
    due: number
    currency?: string
    by?: string
    items: { description: string; code?: string; quantity: number; unitPrice: number }[]
  }[] = [
    { c: 0, status: 'PAID', issued: -85, due: -55, items: [{ code: 'WEB-01', description: 'Corporate website redesign', quantity: 1, unitPrice: 18500 }, { description: 'Hosting & maintenance (12 months)', quantity: 12, unitPrice: 350 }] },
    { c: 1, status: 'PAID', issued: -62, due: -32, by: sales.id, items: [{ code: 'CONS', description: 'Site supervision consultancy', quantity: 40, unitPrice: 450 }] },
    { c: 2, status: 'PAID', issued: -40, due: -10, items: [{ description: 'Brand identity & signage design', quantity: 1, unitPrice: 9800 }] },
    { c: 3, status: 'PENDING', issued: -12, due: 18, by: sales.id, items: [{ code: 'LOG-SW', description: 'Fleet tracking dashboard', quantity: 1, unitPrice: 24000 }, { description: 'Driver app licences', quantity: 25, unitPrice: 120 }] },
    { c: 4, status: 'PENDING', issued: -5, due: 25, currency: 'EUR', items: [{ description: 'Product photography — spring catalogue', quantity: 3, unitPrice: 1450 }] },
    { c: 5, status: 'OVERDUE', issued: -50, due: -20, items: [{ code: 'PRN-A4', description: 'Brochure printing (A4, 5,000 pcs)', quantity: 5000, unitPrice: 1.8 }] },
    { c: 0, status: 'PENDING', issued: -2, due: 28, items: [{ description: 'SEO retainer — monthly', quantity: 1, unitPrice: 4500 }] },
    { c: 1, status: 'CANCELLED', issued: -30, due: 0, items: [{ description: 'Duplicate order (cancelled)', quantity: 1, unitPrice: 2000 }] },
  ]

  let invoiceNo = 1
  for (const inv of invoices) {
    const t = totals(inv.items, 5)
    const created = await prisma.invoice.create({
      data: {
        organizationId: DEMO_ORG_ID,
        invoiceNumber: num('INV', invoiceNo++),
        status: inv.status,
        issueDate: daysFromNow(inv.issued),
        dueDate: daysFromNow(inv.due),
        createdAt: daysFromNow(inv.issued),
        currency: inv.currency ?? 'AED',
        taxRate: 5,
        ...t,
        notes: 'Payment due within 30 days. Thank you for your business!',
        userId: inv.by ?? owner.id,
        customerId: customers[inv.c].id,
        paidAt: inv.status === 'PAID' ? daysFromNow(inv.due - 3) : null,
        items: { create: inv.items.map((i) => ({ code: i.code ?? null, description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, total: round2(i.quantity * i.unitPrice) })) },
      },
    })
    if (inv.status === 'PAID') {
      await prisma.payment.create({
        data: {
          organizationId: DEMO_ORG_ID,
          invoiceId: created.id,
          amount: created.total,
          currency: created.currency,
          method: 'BANK_TRANSFER',
          reference: `TRF-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
          paidAt: daysFromNow(inv.due - 3),
          recordedById: accountant.id,
        },
      })
    }
  }

  const quotations: { c: number; status: QuotationStatus; issued: number; valid: number; items: { description: string; quantity: number; unitPrice: number }[] }[] = [
    { c: 3, status: 'SENT', issued: -3, valid: 27, items: [{ description: 'Warehouse management module', quantity: 1, unitPrice: 32000 }] },
    { c: 2, status: 'ACCEPTED', issued: -8, valid: 22, items: [{ description: 'Patient booking website', quantity: 1, unitPrice: 12500 }, { description: 'Arabic translation', quantity: 1, unitPrice: 1800 }] },
    { c: 5, status: 'DRAFT', issued: -1, valid: 29, items: [{ description: 'Annual print contract (estimate)', quantity: 12, unitPrice: 6200 }] },
    { c: 1, status: 'REJECTED', issued: -20, valid: 10, items: [{ description: '3D site visualisation', quantity: 1, unitPrice: 15000 }] },
  ]
  let quoteNo = 1
  for (const q of quotations) {
    const t = totals(q.items, 5)
    await prisma.quotation.create({
      data: {
        organizationId: DEMO_ORG_ID,
        quotationNumber: num('QUO', quoteNo++),
        status: q.status,
        issueDate: daysFromNow(q.issued),
        validUntil: daysFromNow(q.valid),
        createdAt: daysFromNow(q.issued),
        currency: 'AED',
        taxRate: 5,
        ...t,
        userId: sales.id,
        customerId: customers[q.c].id,
        items: { create: q.items.map((i) => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, total: round2(i.quantity * i.unitPrice) })) },
      },
    })
  }

  await prisma.organization.update({ where: { id: DEMO_ORG_ID }, data: { invoiceNextNumber: invoiceNo, quotationNextNumber: quoteNo } })

  console.log('\n✅ Seed complete\n')
  console.log(`   Platform admin : ${adminEmail} ${existingAdmin ? '(existing password unchanged)' : `/ ${adminPassword}`}`)
  console.log(`   Demo owner     : demo@invoiceflow.com / ${DEMO_PASSWORD}`)
  console.log(`   Demo sales     : sales@invoiceflow.com / ${DEMO_PASSWORD}`)
  console.log(`   Demo accountant: accounts@invoiceflow.com / ${DEMO_PASSWORD}\n`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
