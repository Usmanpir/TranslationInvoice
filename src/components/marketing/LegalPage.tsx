import { AlertTriangle } from 'lucide-react'
import { MarketingShell, PageHero } from './MarketingShell'

export interface LegalSection {
  heading: string
  body: string[]
}

/** Shared layout for policy pages. Content is a template that must be reviewed before launch. */
export function LegalPage({ title, updated, intro, sections }: { title: string; updated: string; intro: string; sections: LegalSection[] }) {
  return (
    <MarketingShell>
      <PageHero eyebrow="Legal" title={title} description={`Last updated ${updated}`} />
      <article className="mx-auto max-w-3xl px-4 sm:px-6 pb-24">
        <div role="note" className="flex gap-3 p-4 mb-10 rounded-2xl bg-amber-50 ring-1 ring-amber-200 text-sm text-amber-900">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>
            <strong>Draft for legal review.</strong> This page is a professional template, not legal advice. It must be reviewed and adapted by a qualified
            legal professional (including for UAE requirements) before InvoiceFlow is offered commercially.
          </p>
        </div>
        <p className="text-base text-slate-700 leading-relaxed">{intro}</p>
        {sections.map((s, i) => (
          <section key={s.heading} className="mt-10">
            <h2 className="font-display text-xl font-bold text-slate-900">
              {i + 1}. {s.heading}
            </h2>
            {s.body.map((p, j) => (
              <p key={j} className="mt-3 text-[15px] text-slate-600 leading-relaxed">
                {p}
              </p>
            ))}
          </section>
        ))}
      </article>
    </MarketingShell>
  )
}
