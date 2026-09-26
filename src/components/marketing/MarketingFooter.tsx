import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '/features' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'How it works', href: '/#workflow' },
      { label: 'FAQ', href: '/#faq' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Contact', href: '/contact' },
      { label: 'Sign in', href: '/login' },
      { label: 'Start free trial', href: '/register' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy policy', href: '/privacy' },
      { label: 'Terms of service', href: '/terms' },
      { label: 'Refund policy', href: '/refund-policy' },
    ],
  },
]

export function MarketingFooter() {
  return (
    <footer className="border-t border-slate-100 bg-card">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14 grid grid-cols-2 md:grid-cols-5 gap-10">
        <div className="col-span-2">
          <Logo markClassName="w-8 h-8 rounded-[10px]" />
          <p className="mt-3 text-sm text-slate-500 max-w-xs leading-relaxed">
            Quotations, VAT-ready invoices and payment tracking for businesses in the UAE and beyond.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-900">{col.title}</p>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-100">
        <p className="mx-auto max-w-6xl px-4 sm:px-6 py-5 text-xs text-slate-400">© {new Date().getFullYear()} InvoiceFlow. All rights reserved.</p>
      </div>
    </footer>
  )
}
