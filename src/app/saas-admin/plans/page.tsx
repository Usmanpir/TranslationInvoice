import { PageHeader } from '@/components/ui/PageHeader'
import { BILLING_CURRENCY, FEATURE_LABELS, PLAN_ORDER, PLANS, TRIAL, YEARLY_DISCOUNT, planPrice } from '@/lib/plans'

const lim = (n: number | null) => (n === null ? 'Unlimited' : n.toLocaleString())

/** Read-only view of the plan catalogue. Plans are defined in src/lib/plans.ts. */
export default function SaasPlansPage() {
  return (
    <div>
      <PageHeader title="Plans" description={`Prices in ${BILLING_CURRENCY} · ${Math.round(YEARLY_DISCOUNT * 100)}% yearly discount · ${TRIAL.days}-day ${PLANS[TRIAL.plan].name} trial`} />
      <div className="p-4 sm:p-6 lg:p-10 space-y-5">
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th className="text-left">Limit / feature</th>
                  {PLAN_ORDER.map((id) => (
                    <th key={id} className="text-right">{PLANS[id].name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="text-sm font-medium">Monthly price</td>
                  {PLAN_ORDER.map((id) => <td key={id} className="text-right text-sm tabular-nums">{planPrice(id, 'MONTH')}</td>)}
                </tr>
                <tr>
                  <td className="text-sm font-medium">Yearly price</td>
                  {PLAN_ORDER.map((id) => <td key={id} className="text-right text-sm tabular-nums">{planPrice(id, 'YEAR')}</td>)}
                </tr>
                {(
                  [
                    ['Users', 'users'],
                    ['Customers', 'customers'],
                    ['Invoices / month', 'invoicesPerMonth'],
                    ['Quotations / month', 'quotationsPerMonth'],
                    ['Storage (MB)', 'storageMb'],
                  ] as const
                ).map(([label, key]) => (
                  <tr key={key}>
                    <td className="text-sm font-medium">{label}</td>
                    {PLAN_ORDER.map((id) => <td key={id} className="text-right text-sm tabular-nums">{lim(PLANS[id].limits[key])}</td>)}
                  </tr>
                ))}
                {(Object.keys(FEATURE_LABELS) as (keyof typeof FEATURE_LABELS)[]).map((f) => (
                  <tr key={f}>
                    <td className="text-sm">{FEATURE_LABELS[f].label}{FEATURE_LABELS[f].comingSoon ? ' (coming soon)' : ''}</td>
                    {PLAN_ORDER.map((id) => (
                      <td key={id} className="text-right text-sm">{PLANS[id].features.includes(f) ? '✓' : '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-sm text-slate-500">
          To change prices, limits or features, edit <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-xs">src/lib/plans.ts</code> and deploy. Stripe prices are created automatically for new amounts; existing card subscribers keep their price until they change plan.
        </p>
      </div>
    </div>
  )
}
