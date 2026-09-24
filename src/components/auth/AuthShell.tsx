import Link from 'next/link'
import { CheckCircle2, Receipt, TrendingUp } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'

interface AuthShellProps {
  title: string
  subtitle: string
  children: React.ReactNode
}

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-white">
      {/* Brand panel */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-slate-950 p-12 text-white">
        <div aria-hidden className="absolute inset-0">
          <div className="absolute inset-0 bg-grid-dark mask-radial" />
          <div className="absolute -top-40 -left-40 w-[560px] h-[560px] rounded-full bg-[radial-gradient(closest-side,rgb(12_143_233/0.35),transparent)]" />
          <div className="absolute -bottom-48 -right-32 w-[520px] h-[520px] rounded-full bg-[radial-gradient(closest-side,rgb(139_92_246/0.28),transparent)]" />
        </div>

        <Link href="/" className="relative w-fit" aria-label="InvoiceFlow home">
          <Logo dark />
        </Link>

        <div className="relative max-w-md">
          {/* Mini preview card */}
          <div className="relative mb-10">
            <div className="rounded-2xl bg-white/[0.06] ring-1 ring-white/10 backdrop-blur p-5 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-indigo-600 flex items-center justify-center">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold font-mono">INV-2026-10482</div>
                    <div className="text-xs text-slate-400">Northwind Studio</div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-medium text-emerald-300 ring-1 ring-emerald-400/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Paid
                </span>
              </div>
              <div className="mt-5 flex items-end justify-between">
                <div>
                  <div className="text-xs text-slate-400">Amount</div>
                  <div className="font-display text-2xl font-bold tabular-nums">AED 12,600.00</div>
                </div>
                <div className="flex items-end gap-1 h-10">
                  {[40, 62, 48, 75, 58, 90].map((h, i) => (
                    <div key={i} className="w-2 rounded-t bg-gradient-to-t from-brand-500 to-indigo-400" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute -right-8 -bottom-12 flex items-center gap-2.5 rounded-xl bg-white text-slate-900 px-3.5 py-2.5 shadow-elevated animate-float">
              <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="text-xs">
                <div className="font-semibold">Revenue up</div>
                <div className="text-slate-500">this quarter</div>
              </div>
            </div>
          </div>

          <h2 className="font-display text-3xl xl:text-4xl font-bold tracking-[-0.03em] leading-tight">
            Invoicing that feels{' '}
            <span className="bg-gradient-to-r from-brand-300 to-violet-300 bg-clip-text text-transparent">effortless</span>.
          </h2>
          <ul className="mt-6 space-y-3">
            {[
              'Quotations that convert to invoices in one click',
              'VAT-ready, multi-currency documents',
              'Payment proofs and PDF exports built in',
            ].map((t) => (
              <li key={t} className="flex items-center gap-3 text-sm text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-brand-300 flex-shrink-0" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-500">© {new Date().getFullYear()} InvoiceFlow</p>
      </aside>

      {/* Form panel */}
      <main className="relative flex items-center justify-center px-4 py-12 sm:px-8">
        <div aria-hidden className="absolute inset-0 lg:hidden overflow-hidden">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[640px] h-[420px] rounded-full bg-[radial-gradient(closest-side,rgb(12_143_233/0.14),transparent)]" />
        </div>
        <div className="relative w-full max-w-[400px] animate-fade-up">
          <Link href="/" className="lg:hidden inline-flex mb-10" aria-label="InvoiceFlow home">
            <Logo />
          </Link>
          <h1 className="font-display text-[1.75rem] font-bold text-slate-900 tracking-tight">{title}</h1>
          <p className="text-sm text-slate-500 mt-1.5 mb-8">{subtitle}</p>
          {children}
        </div>
      </main>
    </div>
  )
}
