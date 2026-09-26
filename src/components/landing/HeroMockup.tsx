import { ArrowRightLeft, CheckCircle2, Clock, LayoutDashboard, Receipt, TrendingUp, Users, FileQuestion, AlertCircle } from 'lucide-react'

/** Illustrative product preview for the landing hero (sample data only). */
export function HeroMockup() {
  const rows = [
    { no: 'INV-2026-10482', who: 'Northwind Studio', amt: 'AED 12,600.00', status: 'Paid', tone: 'emerald' },
    { no: 'INV-2026-10479', who: 'Blue Harbor LLC', amt: '$4,250.00', status: 'Pending', tone: 'amber' },
    { no: 'INV-2026-10471', who: 'Atlas & Co.', amt: '€2,980.00', status: 'Paid', tone: 'emerald' },
    { no: 'INV-2026-10466', who: 'Kestrel Media', amt: 'AED 7,315.00', status: 'Overdue', tone: 'red' },
  ] as const

  const tone = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
  }
  const dot = { emerald: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-red-500' }

  const bars = [38, 52, 44, 66, 58, 74, 62, 86, 71, 92, 80, 96]

  return (
    <div className="relative mx-auto max-w-5xl" aria-hidden>
      {/* Glow */}
      <div className="absolute -inset-x-10 -top-10 bottom-0 bg-gradient-to-b from-brand-400/25 via-indigo-400/15 to-transparent blur-3xl rounded-[3rem]" />

      {/* Browser frame */}
      <div className="relative rounded-[20px] p-1.5 bg-gradient-to-b from-card/80 to-card/30 ring-1 ring-slate-900/10 shadow-elevated backdrop-blur">
        <div className="rounded-2xl overflow-hidden bg-card ring-1 ring-slate-900/5">
          <div className="flex items-center gap-2 h-9 px-4 bg-slate-50 border-b border-slate-200/70">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
            <div className="mx-auto h-5 w-56 max-w-[45%] rounded-md bg-card border border-slate-200/80 text-[10px] text-slate-400 flex items-center justify-center font-mono whitespace-nowrap overflow-hidden px-2">
              app.invoiceflow / dashboard
            </div>
          </div>

          <div className="flex min-h-[340px] sm:min-h-[400px]">
            {/* Mini sidebar */}
            <div className="hidden sm:flex w-44 flex-col gap-1 bg-ink-950 p-3">
              <div className="flex items-center gap-2 px-2 py-1.5 mb-3">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-brand-400 to-indigo-600" />
                <div className="h-2.5 w-16 rounded bg-card/80" />
              </div>
              {[
                { I: LayoutDashboard, l: 'Dashboard', a: true },
                { I: Users, l: 'Customers' },
                { I: Receipt, l: 'Invoices' },
                { I: FileQuestion, l: 'Quotations' },
              ].map(({ I, l, a }) => (
                <div
                  key={l}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] font-medium ${a ? 'bg-white/10 text-white' : 'text-ink-400'}`}
                >
                  <I className="w-3.5 h-3.5" />
                  {l}
                </div>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 p-4 sm:p-5 bg-surface-50 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-display font-bold text-slate-900">Dashboard</div>
                  <div className="text-[10px] text-slate-400">Your business overview at a glance</div>
                </div>
                <div className="h-7 px-3 rounded-lg bg-gradient-to-b from-brand-500 to-brand-600 text-white text-[10px] font-semibold flex items-center shadow-btn-brand">
                  + New Invoice
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { l: 'Total Revenue', v: 'AED 184,920', I: TrendingUp, c: 'from-emerald-400 to-emerald-600' },
                  { l: 'Total Invoices', v: '248', I: Receipt, c: 'from-brand-400 to-brand-600' },
                  { l: 'Pending', v: 'AED 23,140', I: Clock, c: 'from-amber-400 to-orange-500' },
                  { l: 'Overdue', v: '3', I: AlertCircle, c: 'from-rose-400 to-red-600' },
                ].map(({ l, v, I, c }, i) => (
                  <div key={l} className={`rounded-xl bg-card border border-slate-200/70 p-3 shadow-card ${i > 1 ? 'hidden lg:block' : ''}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">{l}</span>
                      <span className={`w-5 h-5 rounded-md bg-gradient-to-br ${c} flex items-center justify-center`}>
                        <I className="w-3 h-3 text-white" />
                      </span>
                    </div>
                    <div className="mt-1.5 text-sm font-display font-bold text-slate-900">{v}</div>
                  </div>
                ))}
              </div>

              <div className="grid lg:grid-cols-5 gap-3">
                <div className="lg:col-span-3 rounded-xl bg-card border border-slate-200/70 shadow-card overflow-hidden">
                  <div className="px-3.5 py-2.5 border-b border-slate-100 text-[11px] font-semibold text-slate-900">Recent Invoices</div>
                  {rows.map((r) => (
                    <div key={r.no} className="flex items-center gap-3 px-3.5 py-2 border-b border-slate-50 last:border-0">
                      <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center">
                        <Receipt className="w-3 h-3 text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10.5px] font-semibold text-slate-900 font-mono truncate">{r.no}</div>
                        <div className="text-[9.5px] text-slate-400 truncate">{r.who}</div>
                      </div>
                      <span className={`hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9px] font-medium ${tone[r.tone]}`}>
                        <span className={`w-1 h-1 rounded-full ${dot[r.tone]}`} />
                        {r.status}
                      </span>
                      <div className="text-[10.5px] font-semibold text-slate-900 tabular-nums">{r.amt}</div>
                    </div>
                  ))}
                </div>
                <div className="hidden lg:flex lg:col-span-2 flex-col rounded-xl bg-card border border-slate-200/70 shadow-card p-3.5">
                  <div className="text-[11px] font-semibold text-slate-900">Revenue</div>
                  <div className="text-[9.5px] text-slate-400">Last 12 months</div>
                  <div className="flex-1 flex items-end gap-1.5 mt-3">
                    {bars.map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t-[3px] bg-gradient-to-t from-brand-500 to-indigo-400"
                        style={{ height: `${h}%`, opacity: 0.35 + (i / bars.length) * 0.65 }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating: payment received */}
      <div className="hidden md:flex absolute -left-8 lg:-left-14 top-[38%] items-center gap-3 p-3 pr-4 rounded-2xl bg-card/95 backdrop-blur ring-1 ring-slate-900/5 shadow-elevated animate-float">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
          <CheckCircle2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-900">Payment received</div>
          <div className="text-[11px] text-slate-500">INV-2026-10482 · AED 12,600</div>
        </div>
      </div>

      {/* Floating: quotation converted */}
      <div
        className="hidden md:flex absolute -right-6 lg:-right-12 bottom-10 items-center gap-3 p-3 pr-4 rounded-2xl bg-card/95 backdrop-blur ring-1 ring-slate-900/5 shadow-elevated animate-float"
        style={{ animationDelay: '-3s' }}
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
          <ArrowRightLeft className="w-[18px] h-[18px] text-white" />
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-900">Quotation converted</div>
          <div className="text-[11px] text-slate-500">QUO-2026-30391 → Invoice</div>
        </div>
      </div>
    </div>
  )
}
