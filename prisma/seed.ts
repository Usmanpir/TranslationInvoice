// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create default admin user
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@invoiceflow.com'
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456'
  const adminHashedPassword = await bcrypt.hash(adminPassword, 12)

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: 'admin' },
    create: {
      name: 'Admin',
      email: adminEmail,
      password: adminHashedPassword,
      role: 'admin',
      companyName: 'InvoiceFlow',
    },
  })

  console.log(`🔑 Default admin created: ${adminEmail} / ${adminPassword}`)

  // Create demo user
  const hashedPassword = await bcrypt.hash('demo123456', 12)

  const user = await prisma.user.upsert({
    where: { email: 'demo@invoiceflow.com' },
    update: {},
    create: {
      name: 'Alex Johnson',
      email: 'demo@invoiceflow.com',
      password: hashedPassword,
      companyName: 'InvoiceFlow Co.',
      address: '123 Business Ave, San Francisco, CA 94102',
      phone: '+1 (555) 123-4567',
      taxNumber: 'TAX-987654321',
    },
  })

  // Create customers
  const customers = await Promise.all([
    prisma.customer.upsert({
      where: { id: 'customer-1' },
      update: {},
      create: {
        id: 'customer-1',
        name: 'Sarah Mitchell',
        email: 'sarah@techcorp.com',
        phone: '+1 (555) 234-5678',
        company: 'TechCorp Inc.',
        address: '456 Innovation Dr, Austin, TX 78701',
        taxNumber: 'TAX-111222333',
        userId: user.id,
      },
    }),
    prisma.customer.upsert({
      where: { id: 'customer-2' },
      update: {},
      create: {
        id: 'customer-2',
        name: 'Marcus Chen',
        email: 'marcus@designstudio.com',
        phone: '+1 (555) 345-6789',
        company: 'Design Studio LLC',
        address: '789 Creative Blvd, Portland, OR 97201',
        userId: user.id,
      },
    }),
    prisma.customer.upsert({
      where: { id: 'customer-3' },
      update: {},
      create: {
        id: 'customer-3',
        name: 'Emma Rodriguez',
        email: 'emma@globalventures.com',
        phone: '+1 (555) 456-7890',
        company: 'Global Ventures',
        address: '321 Enterprise Way, New York, NY 10001',
        taxNumber: 'TAX-444555666',
        userId: user.id,
      },
    }),
  ])

  // Create invoices
  const now = new Date()
  await prisma.invoice.upsert({
    where: { invoiceNumber: 'INV-2024-001' },
    update: {},
    create: {
      invoiceNumber: 'INV-2024-001',
      status: 'PAID',
      issueDate: new Date(now.getFullYear(), now.getMonth() - 1, 15),
      dueDate: new Date(now.getFullYear(), now.getMonth(), 15),
      taxRate: 10,
      subtotal: 3500,
      taxAmount: 350,
      discountAmount: 0,
      total: 3850,
      notes: 'Thank you for your business!',
      userId: user.id,
      customerId: customers[0].id,
      items: {
        create: [
          { description: 'Web Development Services', quantity: 20, unitPrice: 150, total: 3000 },
          { description: 'UI/UX Design', quantity: 5, unitPrice: 100, total: 500 },
        ],
      },
    },
  })

  await prisma.invoice.upsert({
    where: { invoiceNumber: 'INV-2024-002' },
    update: {},
    create: {
      invoiceNumber: 'INV-2024-002',
      status: 'PENDING',
      issueDate: new Date(now.getFullYear(), now.getMonth(), 1),
      dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      taxRate: 10,
      subtotal: 2200,
      taxAmount: 220,
      discountAmount: 0,
      total: 2420,
      userId: user.id,
      customerId: customers[1].id,
      items: {
        create: [
          { description: 'Brand Identity Design', quantity: 1, unitPrice: 1500, total: 1500 },
          { description: 'Logo Revisions', quantity: 7, unitPrice: 100, total: 700 },
        ],
      },
    },
  })

  await prisma.invoice.upsert({
    where: { invoiceNumber: 'INV-2024-003' },
    update: {},
    create: {
      invoiceNumber: 'INV-2024-003',
      status: 'OVERDUE',
      issueDate: new Date(now.getFullYear(), now.getMonth() - 2, 10),
      dueDate: new Date(now.getFullYear(), now.getMonth() - 1, 10),
      taxRate: 8,
      subtotal: 5000,
      taxAmount: 400,
      discountAmount: 250,
      discount: 5,
      total: 5150,
      notes: 'Payment overdue. Please remit immediately.',
      userId: user.id,
      customerId: customers[2].id,
      items: {
        create: [
          { description: 'Marketing Strategy Consultation', quantity: 10, unitPrice: 300, total: 3000 },
          { description: 'Social Media Campaign Setup', quantity: 1, unitPrice: 2000, total: 2000 },
        ],
      },
    },
  })

  // Create quotation
  await prisma.quotation.upsert({
    where: { quotationNumber: 'QUO-2024-001' },
    update: {},
    create: {
      quotationNumber: 'QUO-2024-001',
      status: 'SENT',
      issueDate: new Date(now.getFullYear(), now.getMonth(), 5),
      validUntil: new Date(now.getFullYear(), now.getMonth() + 1, 5),
      taxRate: 10,
      subtotal: 8000,
      taxAmount: 800,
      discountAmount: 0,
      total: 8800,
      notes: 'This quotation is valid for 30 days.',
      userId: user.id,
      customerId: customers[0].id,
      items: {
        create: [
          { description: 'E-commerce Platform Development', quantity: 1, unitPrice: 5000, total: 5000 },
          { description: 'Payment Gateway Integration', quantity: 1, unitPrice: 1500, total: 1500 },
          { description: 'Testing & QA', quantity: 15, unitPrice: 100, total: 1500 },
        ],
      },
    },
  })

  console.log('✅ Seed data created successfully!')
  console.log('📧 Demo login: demo@invoiceflow.com')
  console.log('🔑 Password: demo123456')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
