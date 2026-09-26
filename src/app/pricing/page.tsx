import type { Metadata } from 'next'
import Link from 'next/link'
import { Check, Minus } from 'lucide-react'
import { MarketingShell, PageHero } from '@/components/marketing/MarketingShell'
import { MarketingPricing } from '@/components/marketing/MarketingPricing'
import { Faq } from '@/components/marketing/faq'
import { FEATURE_LABELS, PLAN_ORDER, PLANS, TRIAL, type Feature } from '@/lib/plans'

export const metadata: Metadata = {
  title: 'Pricing – InvoiceFlow',
  description: `Simple, transparent pricing for invoicing and quotations. Start with a ${TRIAL.days}-day free trial, no card required.`,
  alternates: { canonical: '/pricing' },
  openGraph: { title: 'InvoiceFlow pricing', description: 'Plans for freelancers, small teams and growing businesses.', url: '/pricing' },
}

const lim = (n: number | null, unit = '') => (n === null ? 'Unlimited' : `${n.toLocaleString()}${unit}`)

export default function PricingPage() {
  const rows: { label: string; values: (string | boolean)[] }[] = [
    { label: 'Team members', values: PLAN_ORDER.map((id) => lim(PLANS[id].limits.users)) },
    { label: 'Customers', values: PLAN_ORDER.map((id) => lim(PLANS[id].limits.customers)) },
    { label: 'Invoices per month', values: PLAN_ORDER.map((id) => lim(PLANS[id].limits.invoicesPerMonth)) },
    { label: 'Quotations per month', values: PLAN_ORDER.map((id) => lim(PLANS[id].limits.quotationsPerMonth)) },
    {
      label: 'File storage',
      values: PLAN_ORDER.map((id) => {
        const mb = PLANS[id].limits.storageMb
        return mb === null ? 'Unlimited' : mb >= 1024 ? `${mb / 1024} GB` : `${mb} MB`
      }),
    },
    { label: 'PDF invoices & quotations', values: PLAN_ORDER.map(() => true) },
    { label: 'VAT / TRN on documents', values: PLAN_ORDER.map(() => true) },
    ...(Object.keys(FEATURE_LABELS) as Feature[]).map((f) => ({
      label: FEATURE_LABELS[f].label + (FEATURE_LABELS[f].comingSoon ? ' (coming soon)' : ''),
      values: PLAN_ORDER.map((id) => PLANS[id].features.includes(f)),
    })),
  ]

  return (
    <MarketingShell>
      <PageHero
        eyebrow="Pricing"
        title="Plans for every stage of your business"
        description={`Try ${PLANS[TRIAL.plan].name} free for ${TRIAL.days} days. No card required, cancel any time, and your data is always yours.`}
      />
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-20">
        <MarketingPricing />
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-24">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 text-center tracking-tight">Compare plans</h2>
        <div className="mt-10 overflow-x-auto rounded-3xl ring-1 ring-slate-200/80 bg-card shadow-card">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-6 py-4 font-semibold text-slate-500">Features</th>
                {PLAN_ORDER.map((id) => (
                  <th key={id} className="px-4 py-4 font-display text-base font-bold text-slate-900">
                    {PLANS[id].name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.label} className="hover:bg-slate-50/60">
                  <td className="px-6 py-3.5 text-slate-700">{row.label}</td>
                  {row.values.map((v, i) => (
                    <td key={i} className="px-4 py-3.5 text-center">
                      {typeof v === 'boolean' ? (
                        v ? <Check className="w-4 h-4 text-emerald-500 mx-auto" aria-label="Included" /> : <Minus className="w-4 h-4 text-slate-300 mx-auto" aria-label="Not included" />
                      ) : (
                        <span className="font-medium text-slate-900 tabular-nums">{v}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-slate-50/60 border-y border-slate-100 py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 text-center tracking-tight mb-10">Frequently asked questions</h2>
          <Faq />
          <p className="mt-10 text-center text-sm text-slate-600">
            Still have questions?{' '}
            <Link href="/contact" className="font-semibold text-brand-600 hover:text-brand-700">
              Talk to us
            </Link>
          </p>
        </div>
      </section>
    </MarketingShell>
  )
}
