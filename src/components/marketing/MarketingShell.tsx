import { LandingNav } from '@/components/landing/LandingNav'
import { MarketingFooter } from './MarketingFooter'

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-card text-slate-900 overflow-x-clip">
      <LandingNav />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  )
}

/** Hero band for secondary marketing pages (pricing, features, legal, contact). */
export function PageHero({ eyebrow, title, description }: { eyebrow: string; title: React.ReactNode; description?: string }) {
  return (
    <section className="relative pt-36 sm:pt-44 pb-14">
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-50/70 via-card to-card" />
        <div className="absolute inset-x-0 top-0 h-[520px] bg-grid mask-radial opacity-70" />
      </div>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center animate-fade-up">
        <span className="eyebrow bg-brand-50 text-brand-700 ring-1 ring-brand-100">{eyebrow}</span>
        <h1 className="mt-5 font-display text-4xl sm:text-5xl font-extrabold tracking-[-0.03em] text-slate-900">{title}</h1>
        {description && <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed">{description}</p>}
      </div>
    </section>
  )
}
