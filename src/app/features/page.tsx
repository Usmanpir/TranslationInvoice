import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  BarChart3,
  Building2,
  Download,
  FileQuestion,
  Percent,
  Receipt,
  ShieldCheck,
  Users,
  UsersRound,
  Wallet,
  Globe2,
} from 'lucide-react'
import { MarketingShell, PageHero } from '@/components/marketing/MarketingShell'
import { TRIAL } from '@/lib/plans'

export const metadata: Metadata = {
  title: 'Features – InvoiceFlow',
  description: 'Invoices, quotations, customers, payments, VAT reports, team roles and branded PDFs in one invoicing platform built for UAE businesses.',
  alternates: { canonical: '/features' },
  openGraph: { title: 'InvoiceFlow features', description: 'Everything you need to quote, invoice and get paid.', url: '/features' },
}

const FEATURES = [
  {
    icon: Receipt,
    title: 'Invoicing',
    body: 'Create professional invoices with line items, VAT, discounts, due dates, salesperson and completion days. Numbers are sequential per workspace (INV-2026-0001), never duplicated.',
    points: ['Sequential numbering with your own prefix', 'Tax-inclusive or tax-exclusive pricing', 'Automatic overdue detection'],
  },
  {
    icon: FileQuestion,
    title: 'Quotations',
    body: 'Send price estimates, track whether they were sent, accepted or rejected, and convert them into invoices in one click — every line item carries over.',
    points: ['Sent / accepted / rejected tracking', 'One-click conversion to invoice', 'PDF download for every quote'],
  },
  {
    icon: Users,
    title: 'Customers',
    body: 'A searchable directory with contacts, companies, addresses and tax numbers — plus each customer’s invoices, quotations, payments and outstanding balance.',
    points: ['Customer TRN on every document', 'Paid, pending and overdue totals', 'Full invoice and payment history'],
  },
  {
    icon: Wallet,
    title: 'Payments',
    body: 'Record how and when each invoice was paid, attach proof of payment, and see every payment in one place.',
    points: ['Bank transfer, cash, cheque, card, PayPal', 'Private payment-proof uploads', 'Payment history with CSV export'],
  },
  {
    icon: BarChart3,
    title: 'Reports',
    body: 'Understand your business with revenue trends, aged receivables and a VAT summary for any period.',
    points: ['Monthly revenue & top customers', 'Aging buckets from current to 90+ days', 'Taxable amount and output VAT by rate'],
  },
  {
    icon: UsersRound,
    title: 'Team management',
    body: 'Invite colleagues by email and choose what each role can do. Permissions are enforced on the server, not just hidden in the UI.',
    points: ['Owner, Admin, Accountant, Sales, Viewer', 'Email invitations that expire in 7 days', 'Audit log of important changes'],
  },
  {
    icon: Download,
    title: 'PDF invoices',
    body: 'Download print-ready PDFs of invoices and quotations, with your logo and brand colour on paid plans.',
    points: ['A4 layout matching your preview', 'Bank & payment instructions included', 'Custom footer text'],
  },
  {
    icon: Building2,
    title: 'Business settings',
    body: 'Company details, TRN, VAT rate, banking information, invoice prefixes and default notes — configured once, used everywhere.',
    points: ['Live invoice preview while you edit', 'Default currency and payment terms', 'Multi-currency: AED, USD and EUR'],
  },
]

export default function FeaturesPage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="Features"
        title="Everything you need to quote, invoice and get paid"
        description="InvoiceFlow is built for UAE businesses and freelancers who want professional documents, clear numbers and a team that works from the same data."
      />
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {FEATURES.map((f) => (
            <article key={f.title} className="rounded-3xl bg-card ring-1 ring-slate-200/80 shadow-card p-7 transition-all hover:-translate-y-0.5 hover:shadow-card-hover">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-brand-600/20">
                <f.icon className="w-5 h-5 text-white" />
              </div>
              <h2 className="mt-5 font-display text-xl font-bold text-slate-900">{f.title}</h2>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{f.body}</p>
              <ul className="mt-4 space-y-1.5">
                {f.points.map((p) => (
                  <li key={p} className="text-sm text-slate-700 flex gap-2">
                    <span className="text-brand-600">•</span> {p}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="mt-14 grid sm:grid-cols-3 gap-4">
          {[
            { icon: Percent, t: 'UAE VAT ready', d: 'TRN on documents, 5% default rate, VAT summary report.' },
            { icon: Globe2, t: 'Multi-currency', d: 'Bill in AED, USD or EUR; each invoice keeps its currency.' },
            { icon: ShieldCheck, t: 'Secure by design', d: 'Isolated workspaces, server-side permissions, private files.' },
          ].map((x) => (
            <div key={x.t} className="rounded-2xl bg-slate-50 ring-1 ring-slate-200/70 p-5">
              <x.icon className="w-5 h-5 text-brand-600" />
              <p className="mt-2 text-sm font-semibold text-slate-900">{x.t}</p>
              <p className="text-sm text-slate-600 mt-1">{x.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <Link href="/register" className="btn-primary btn-lg">
            Start your {TRIAL.days}-day free trial <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </MarketingShell>
  )
}
