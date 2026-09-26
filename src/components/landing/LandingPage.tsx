import Link from 'next/link'
import {
  ArrowRight,
  ArrowRightLeft,
  BarChart3,
  CalendarRange,
  Check,
  CheckCircle2,
  Download,
  FileQuestion,
  Globe2,
  Landmark,
  Percent,
  Receipt,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
  UsersRound,
  Wallet,
  Building2,
} from 'lucide-react'
import { MarketingShell } from '@/components/marketing/MarketingShell'
import { MarketingPricing } from '@/components/marketing/MarketingPricing'
import { Faq } from '@/components/marketing/faq'
import { TRIAL } from '@/lib/plans'
import { HeroMockup } from './HeroMockup'
import { Reveal } from './Reveal'

export function LandingPage() {
  return (
    <MarketingShell>
      <Hero />
      <Benefits />
      <Features />
      <Workflow />
      <Details />
      <Pricing />
      <FaqSection />
      <FinalCta />
    </MarketingShell>
  )
}

/* ------------------------------------------------------------------ */

function Hero() {
  return (
    <section className="relative pt-32 sm:pt-40 pb-20 sm:pb-28">
      {/* Background */}
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-50/70 via-card to-card" />
        <div className="absolute inset-x-0 top-0 h-[720px] bg-grid mask-radial opacity-70" />
        <div className="absolute left-1/2 top-[-180px] -translate-x-1/2 w-[1100px] h-[620px] rounded-full bg-[radial-gradient(closest-side,rgb(12_143_233/0.20),transparent)]" />
        <div className="absolute right-[-120px] top-40 w-[420px] h-[420px] rounded-full bg-[radial-gradient(closest-side,rgb(139_92_246/0.14),transparent)]" />
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 text-center">
        <div className="animate-fade-up">
          <span className="eyebrow bg-card text-slate-700 ring-1 ring-slate-900/10 shadow-card">
            <span className="flex items-center justify-center w-5 h-5 -ml-1.5 rounded-full bg-gradient-to-br from-brand-500 to-indigo-600">
              <Sparkles className="w-3 h-3 text-white" />
            </span>
            {TRIAL.days}-day free trial · no card required
          </span>
        </div>

        <h1
          className="mt-7 font-display text-[2.6rem] leading-[1.05] sm:text-6xl lg:text-7xl font-extrabold tracking-[-0.035em] text-slate-900 animate-fade-up"
          style={{ animationDelay: '80ms' }}
        >
          Create professional invoices.
          <br />
          <span className="text-gradient">Get paid faster.</span>
        </h1>

        <p
          className="mt-6 mx-auto max-w-2xl text-base sm:text-lg text-slate-600 leading-relaxed animate-fade-up"
          style={{ animationDelay: '160ms' }}
        >
          InvoiceFlow brings your customers, quotations, VAT-ready invoices and payments into one secure workspace
          for your whole team — so you spend less time on paperwork and more time on the work that pays.
        </p>

        <div
          className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-up"
          style={{ animationDelay: '240ms' }}
        >
          <Link href="/register" className="btn-primary btn-lg w-full sm:w-auto group">
            Start Free Trial
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link href="/pricing" className="btn-secondary btn-lg w-full sm:w-auto">
            View Pricing
          </Link>
        </div>

        <ul
          className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-500 animate-fade-up"
          style={{ animationDelay: '320ms' }}
        >
          {['Multi-currency: AED, USD & EUR', 'One-click PDF export', 'VAT / TRN ready'].map((t) => (
            <li key={t} className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              {t}
            </li>
          ))}
        </ul>

        <div className="mt-16 sm:mt-20 animate-fade-up" style={{ animationDelay: '420ms' }}>
          <HeroMockup />
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */

function Benefits() {
  const items = [
    { icon: Receipt, label: 'Professional invoices', sub: 'Branded, VAT-ready PDFs' },
    { icon: FileQuestion, label: 'Easy quotations', sub: 'Convert to invoice in one click' },
    { icon: Wallet, label: 'Payment tracking', sub: 'Know who paid and who is late' },
    { icon: Percent, label: 'VAT-ready', sub: 'TRN, rates & VAT summary' },
    { icon: UsersRound, label: 'Team collaboration', sub: 'Roles for sales & accounts' },
    { icon: ShieldCheck, label: 'Secure cloud platform', sub: 'Isolated, encrypted workspaces' },
  ]
  return (
    <section className="relative border-y border-slate-100 bg-slate-50/50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
        {items.map((it, i) => (
          <Reveal key={it.label} delay={i * 60} className="text-center">
            <div className="mx-auto w-10 h-10 rounded-xl bg-card ring-1 ring-slate-200 shadow-card flex items-center justify-center">
              <it.icon className="w-[18px] h-[18px] text-brand-600" />
            </div>
            <div className="mt-3 text-sm font-semibold text-slate-900">{it.label}</div>
            <div className="text-xs text-slate-500 mt-0.5">{it.sub}</div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */

function SectionHeading({ eyebrow, title, desc, dark }: { eyebrow: string; title: React.ReactNode; desc: string; dark?: boolean }) {
  return (
    <Reveal className="mx-auto max-w-2xl text-center">
      <span className={`eyebrow ${dark ? 'bg-white/10 text-fixed-brand-200 ring-1 ring-white/15' : 'bg-brand-50 text-brand-700 ring-1 ring-brand-100'}`}>
        {eyebrow}
      </span>
      <h2 className={`mt-4 font-display text-3xl sm:text-[2.75rem] sm:leading-[1.1] font-bold tracking-[-0.03em] ${dark ? 'text-white' : 'text-slate-900'}`}>
        {title}
      </h2>
      <p className={`mt-4 text-base sm:text-lg leading-relaxed ${dark ? 'text-slate-400' : 'text-slate-600'}`}>{desc}</p>
    </Reveal>
  )
}

function Features() {
  return (
    <section id="features" className="relative py-24 sm:py-32 scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Features"
          title={<>Everything you need to bill <span className="text-gradient whitespace-nowrap">like a pro</span></>}
          desc="From the first quote to the final payment, InvoiceFlow keeps every document, customer and number exactly where you expect it."
        />

        <div className="mt-16 grid grid-cols-1 md:grid-cols-6 gap-4 sm:gap-5">
          {/* Large: invoices */}
          <Reveal className="md:col-span-4">
            <FeatureCard
              icon={Receipt}
              color="from-brand-400 to-brand-600"
              title="Professional, VAT-ready invoices"
              desc="Line items, discounts, VAT and your company details laid out cleanly — with due dates, salesperson and completion days when you need them."
              className="h-full"
            >
              <div className="mt-6 rounded-xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-card p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <div className="font-mono text-xs font-semibold text-slate-900">Invoice # INV-2026-10482</div>
                  <span className="badge bg-emerald-50 text-emerald-700 border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Paid
                  </span>
                </div>
                <div className="mt-4 space-y-2">
                  {[
                    ['Brand identity design', 'AED 8,000.00'],
                    ['Website copywriting (EN–AR)', 'AED 3,200.00'],
                    ['Project management', 'AED 800.00'],
                  ].map(([d, a]) => (
                    <div key={d} className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">{d}</span>
                      <span className="font-medium text-slate-900 tabular-nums">{a}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-dashed border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500">VAT 5%</span>
                  <span className="text-slate-700 tabular-nums">AED 600.00</span>
                </div>
                <div className="mt-2 flex items-center justify-between rounded-lg bg-ink-900 text-white px-3 py-2 text-sm font-semibold">
                  <span>Total</span>
                  <span className="tabular-nums">AED 12,600.00</span>
                </div>
              </div>
            </FeatureCard>
          </Reveal>

          {/* Quotations */}
          <Reveal className="md:col-span-2" delay={80}>
            <FeatureCard
              icon={FileQuestion}
              color="from-violet-400 to-purple-600"
              title="Quotations that convert"
              desc="Send a price estimate, then turn it into an invoice in one click — every line item carries over."
              className="h-full"
            >
              <div className="mt-6 flex items-center gap-2">
                <div className="flex-1 rounded-xl border border-slate-200 bg-card p-3 text-center">
                  <FileQuestion className="w-4 h-4 mx-auto text-purple-500" />
                  <div className="mt-1 text-[11px] font-semibold text-slate-700">Quotation</div>
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-brand-500 flex items-center justify-center shadow-lg shadow-purple-500/30 flex-shrink-0">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="flex-1 rounded-xl border border-slate-200 bg-card p-3 text-center">
                  <Receipt className="w-4 h-4 mx-auto text-brand-500" />
                  <div className="mt-1 text-[11px] font-semibold text-slate-700">Invoice</div>
                </div>
              </div>
            </FeatureCard>
          </Reveal>

          <Reveal className="md:col-span-2">
            <FeatureCard
              icon={Users}
              color="from-emerald-400 to-teal-600"
              title="Customer directory"
              desc="Contacts, companies, addresses and tax numbers — searchable and always one click away."
              className="h-full"
            />
          </Reveal>
          <Reveal className="md:col-span-2" delay={80}>
            <FeatureCard
              icon={Download}
              color="from-sky-400 to-brand-600"
              title="Instant PDF export"
              desc="Download a polished, print-ready PDF of any invoice the moment it's created."
              className="h-full"
            />
          </Reveal>
          <Reveal className="md:col-span-2" delay={160}>
            <FeatureCard
              icon={Upload}
              color="from-amber-400 to-orange-500"
              title="Payment proof uploads"
              desc="Attach receipts or transfer slips when marking an invoice paid — kept right on the record."
              className="h-full"
            />
          </Reveal>

          <Reveal className="md:col-span-3">
            <FeatureCard
              icon={BarChart3}
              color="from-indigo-400 to-indigo-600"
              title="Reports that tell the story"
              desc="Revenue trends, aged receivables and a VAT summary, plus a live dashboard filterable by any date range."
              className="h-full"
            >
              <div className="mt-6 flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-card text-slate-600">
                  <CalendarRange className="w-3.5 h-3.5 text-slate-400" /> Jan 01 – Mar 31
                </span>
                <span className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-brand-600 text-white font-medium">Apply</span>
              </div>
            </FeatureCard>
          </Reveal>
          <Reveal className="md:col-span-3" delay={80}>
            <FeatureCard
              icon={ShieldCheck}
              color="from-slate-600 to-slate-900"
              title="Team access with roles"
              desc="Invite your team as Admins, Accountants, Sales or Viewers, and each role sees exactly what it needs."
              className="h-full"
            >
              <div className="mt-6 flex -space-x-2">
                {['from-brand-400 to-brand-600', 'from-violet-400 to-purple-600', 'from-emerald-400 to-teal-600', 'from-amber-400 to-orange-500'].map((g, i) => (
                  <div key={g} className={`w-8 h-8 rounded-full ring-2 ring-card bg-gradient-to-br ${g} flex items-center justify-center text-[11px] font-bold text-white`}>
                    {['A', 'M', 'S', 'R'][i]}
                  </div>
                ))}
                <div className="w-8 h-8 rounded-full ring-2 ring-card bg-slate-100 flex items-center justify-center text-[11px] font-semibold text-slate-500">+</div>
              </div>
            </FeatureCard>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

function FeatureCard({
  icon: Icon,
  color,
  title,
  desc,
  children,
  className = '',
}: {
  icon: any
  color: string
  title: string
  desc: string
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-card p-6 sm:p-7 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover hover:border-slate-300/80 ${className}`}
    >
      <div aria-hidden className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-brand-500/[0.06] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className={`relative w-11 h-11 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg shadow-slate-900/10 ring-1 ring-inset ring-white/20`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <h3 className="relative mt-5 font-display text-lg font-bold text-slate-900 tracking-tight">{title}</h3>
      <p className="relative mt-2 text-sm text-slate-600 leading-relaxed">{desc}</p>
      {children && <div className="relative">{children}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Workflow() {
  const steps = [
    { n: '01', icon: Building2, title: 'Create your business', desc: 'Sign up, add your logo, TRN and bank details. Your workspace is ready in minutes.' },
    { n: '02', icon: Users, title: 'Add customers', desc: 'Keep contacts, companies, addresses and tax numbers in one searchable directory.' },
    { n: '03', icon: FileQuestion, title: 'Create a quotation', desc: 'Add line items, VAT and discounts, then download a polished PDF.' },
    { n: '04', icon: ArrowRightLeft, title: 'Convert to invoice', desc: 'Once accepted, turn it into a numbered invoice with one click. Nothing retyped.' },
    { n: '05', icon: CheckCircle2, title: 'Track payment', desc: 'Record payments and proofs, chase overdue invoices and watch revenue grow.' },
  ]
  return (
    <section id="workflow" className="relative py-24 sm:py-32 bg-slate-50/60 border-y border-slate-100 scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="How it works"
          title="From signup to paid in five steps"
          desc="A workflow that mirrors how you already do business — just faster, tidier and with nothing lost in between."
        />

        <div className="relative mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          <div aria-hidden className="hidden lg:block absolute top-[52px] left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-brand-300 to-transparent" />
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 120} className="relative">
              <div className="h-full rounded-3xl bg-card border border-slate-200/80 p-6 shadow-card text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover">
                <div className="relative mx-auto w-14 h-14">
                  <div className="absolute inset-0 rounded-2xl bg-brand-500/20 blur-lg" />
                  <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center ring-4 ring-card shadow-lg shadow-brand-600/30">
                    <s.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="mt-5 font-mono text-xs font-medium text-brand-600">STEP {s.n}</div>
                <h3 className="mt-1.5 font-display text-lg font-bold text-slate-900 tracking-tight">{s.title}</h3>
                <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */

function Details() {
  const points = [
    { icon: Globe2, title: 'Multi-currency', desc: 'Bill in AED, USD or EUR with correct formatting on every document.' },
    { icon: Percent, title: 'VAT & discounts', desc: 'Per-document VAT rate and percentage discounts, calculated for you.' },
    { icon: Landmark, title: 'Bank & PayPal details', desc: 'Bank, IBAN, SWIFT and PayPal printed right on your invoice terms.' },
    { icon: ShieldCheck, title: 'Secure by default', desc: 'Password-protected accounts with role-based access for your team.' },
  ]
  return (
    <section id="details" className="relative py-24 sm:py-32 bg-ink-950 text-white overflow-hidden scroll-mt-20">
      <div aria-hidden className="absolute inset-0">
        <div className="absolute inset-0 bg-grid-dark mask-radial" />
        <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-[radial-gradient(closest-side,rgb(12_143_233/0.25),transparent)]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">
          <div>
            <Reveal>
              <span className="eyebrow bg-white/10 text-fixed-brand-200 ring-1 ring-white/15">Built for the details</span>
              <h2 className="mt-4 font-display text-3xl sm:text-[2.75rem] sm:leading-[1.1] font-bold tracking-[-0.03em]">
                The small things that make invoices <span className="bg-gradient-to-r from-brand-300 to-violet-300 bg-clip-text text-transparent">look right</span>
              </h2>
              <p className="mt-4 text-base sm:text-lg text-ink-400 leading-relaxed">
                Tax numbers, bank transfer details and currencies are handled properly — so every document you
                send looks as professional as your work.
              </p>
            </Reveal>

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-7">
              {points.map((p, i) => (
                <Reveal key={p.title} delay={i * 80} className="flex gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.07] ring-1 ring-white/10 flex items-center justify-center flex-shrink-0">
                    <p.icon className="w-[18px] h-[18px] text-brand-300" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold text-white">{p.title}</h3>
                    <p className="mt-1 text-sm text-ink-400 leading-relaxed">{p.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          {/* Currency showcase */}
          <Reveal delay={120}>
            <div className="relative">
              <div aria-hidden className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-brand-500/20 to-violet-500/20 blur-2xl" />
              <div className="relative rounded-3xl bg-white/[0.04] ring-1 ring-white/10 backdrop-blur p-5 sm:p-6 space-y-3">
                {[
                  { code: 'AED', label: 'UAE Dirham', amt: 'AED 12,600.00', vat: 'VAT TRN No. 100234567800003' },
                  { code: 'USD', label: 'US Dollar', amt: '$4,250.00', vat: 'SWIFT · IBAN on invoice' },
                  { code: 'EUR', label: 'Euro', amt: '€2,980.00', vat: 'Discount 10% applied' },
                ].map((c, i) => (
                  <div
                    key={c.code}
                    className={`flex items-center gap-3 sm:gap-4 rounded-2xl bg-white/[0.06] ring-1 ring-white/10 px-3.5 sm:px-4 py-4 transition-colors hover:bg-white/[0.09] ${['sm:mr-6', 'sm:mx-3', 'sm:ml-6'][i]}`}
                  >
                    <div className="w-11 h-11 flex-shrink-0 rounded-xl bg-gradient-to-br from-brand-400 to-indigo-600 flex items-center justify-center font-mono text-xs font-bold">
                      {c.code}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold">{c.label}</div>
                      <div className="text-xs text-ink-400 truncate">{c.vat}</div>
                    </div>
                    <div className="font-display text-[15px] sm:text-lg font-bold tabular-nums whitespace-nowrap">{c.amt}</div>
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-2 px-1 text-xs text-ink-400">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Totals, VAT and discounts calculated automatically
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */

function Pricing() {
  return (
    <section id="pricing" className="relative py-24 sm:py-32 scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Pricing"
          title="Simple plans that grow with you"
          desc={`Start with a ${TRIAL.days}-day free trial. Stay on Free as long as you like, or upgrade when your business needs more.`}
        />
        <div className="mt-14">
          <MarketingPricing />
        </div>
        <p className="mt-8 text-center">
          <Link href="/pricing" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
            Compare all features →
          </Link>
        </p>
      </div>
    </section>
  )
}

function FaqSection() {
  return (
    <section id="faq" className="relative py-24 sm:py-28 bg-slate-50/60 border-y border-slate-100 scroll-mt-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <SectionHeading eyebrow="FAQ" title="Questions, answered" desc="Everything you need to know before you start." />
        <div className="mt-12">
          <Faq />
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */

function FinalCta() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-600 via-brand-600 to-indigo-700 px-6 py-16 sm:px-16 sm:py-20 text-center shadow-glow">
            <div aria-hidden className="absolute inset-0 bg-grid-dark opacity-60 mask-radial" />
            <div aria-hidden className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
            <div aria-hidden className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-violet-400/20 blur-3xl" />
            <div className="relative">
              <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-[-0.03em] text-white">
                Start managing your invoices today.
              </h2>
              <p className="mt-4 mx-auto max-w-xl text-base sm:text-lg text-fixed-brand-100/90 leading-relaxed">
                Set up your workspace in minutes. Free for {TRIAL.days} days, no card required.
              </p>
              <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/register"
                  className="btn btn-lg w-full sm:w-auto bg-card text-brand-700 shadow-xl shadow-brand-900/20 hover:bg-brand-50 hover:-translate-y-px group"
                >
                  Start free trial
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/login"
                  className="btn btn-lg w-full sm:w-auto text-white ring-1 ring-inset ring-white/30 hover:bg-white/10"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
