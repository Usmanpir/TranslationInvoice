import type { Metadata } from 'next'
import { Clock, LifeBuoy, MessageSquare } from 'lucide-react'
import { MarketingShell, PageHero } from '@/components/marketing/MarketingShell'
import { ContactForm } from '@/components/marketing/ContactForm'

export const metadata: Metadata = {
  title: 'Contact – InvoiceFlow',
  description: 'Talk to the InvoiceFlow team about sales, support or billing.',
  alternates: { canonical: '/contact' },
}

export default function ContactPage() {
  return (
    <MarketingShell>
      <PageHero eyebrow="Contact" title="We’d love to hear from you" description="Questions about plans, VAT, onboarding your team or your account? Send us a message." />
      <section className="mx-auto max-w-5xl px-4 sm:px-6 pb-24 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        <div className="rounded-3xl bg-white ring-1 ring-slate-200/80 shadow-card p-6 sm:p-8">
          <ContactForm />
        </div>
        <aside className="space-y-4">
          {[
            { icon: MessageSquare, t: 'Sales', d: 'Plans, pricing and team onboarding.' },
            { icon: LifeBuoy, t: 'Support', d: 'Help with invoices, VAT settings and your account.' },
            { icon: Clock, t: 'Response time', d: 'Usually within one business day (UAE time).' },
          ].map((x) => (
            <div key={x.t} className="rounded-2xl bg-slate-50 ring-1 ring-slate-200/70 p-5">
              <x.icon className="w-5 h-5 text-brand-600" />
              <p className="mt-2 text-sm font-semibold text-slate-900">{x.t}</p>
              <p className="text-sm text-slate-600 mt-0.5">{x.d}</p>
            </div>
          ))}
        </aside>
      </section>
    </MarketingShell>
  )
}
