import { ChevronDown } from 'lucide-react'
import { PLANS, TRIAL } from '@/lib/plans'

export const FAQ_ITEMS = [
  {
    q: 'How does the free trial work?',
    a: `Every new workspace gets ${TRIAL.days} days of the ${PLANS[TRIAL.plan].name} plan — no card required. When the trial ends you can pick a plan, or keep using InvoiceFlow on the Free plan. Your data is never deleted when a trial ends.`,
  },
  {
    q: 'Is InvoiceFlow ready for UAE VAT?',
    a: 'Yes. Add your TRN once and it appears on every invoice and quotation, together with your customer’s TRN, the VAT rate and the VAT amount. You can bill tax-exclusive or tax-inclusive, and the VAT summary report shows taxable amounts and output VAT for any period. Always confirm your filing with your accountant.',
  },
  {
    q: 'What happens if I reach my invoice limit?',
    a: `On the Free plan you can create ${PLANS.free.limits.invoicesPerMonth} invoices and ${PLANS.free.limits.quotationsPerMonth} quotations per month. When you reach a limit we show you exactly where you stand and which plan lifts it — nothing you have already created is affected. Monthly limits reset on the 1st.`,
  },
  {
    q: 'Can my team work in the same workspace?',
    a: 'Yes. Invite teammates by email and give each person a role — Admin, Accountant, Sales or Viewer — so everyone sees exactly what they need. The number of seats depends on your plan.',
  },
  {
    q: 'Can I download invoices as PDF?',
    a: 'Every invoice and quotation can be downloaded as a print-ready PDF on every plan. On Starter and above your logo and brand colour appear on the PDF too.',
  },
  {
    q: 'How is my data kept secure?',
    a: 'Each business’s data is isolated in its own workspace and every request is checked on the server. Passwords are hashed, files such as payment proofs are private to your workspace, and all traffic is encrypted over HTTPS.',
  },
  {
    q: 'Can I cancel at any time?',
    a: 'Yes. Cancel from the Billing page and your plan stays active until the end of the period you have paid for. After that your workspace moves to the Free plan and your data stays available.',
  },
]

export function Faq({ items = FAQ_ITEMS }: { items?: typeof FAQ_ITEMS }) {
  return (
    <div className="divide-y divide-slate-200/70 rounded-3xl bg-card ring-1 ring-slate-200/80 shadow-card">
      {items.map((item) => (
        <details key={item.q} className="group px-6 py-5 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer items-center justify-between gap-4 list-none">
            <h3 className="text-[15px] font-semibold text-slate-900">{item.q}</h3>
            <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0 transition-transform group-open:rotate-180" />
          </summary>
          <p className="mt-3 text-sm text-slate-600 leading-relaxed">{item.a}</p>
        </details>
      ))}
    </div>
  )
}
