import { StatusBadge } from '@/components/ui/StatusBadge'
import { LogoMark } from '@/components/ui/Logo'
import { formatCurrency, formatDate } from '@/lib/utils'

export interface PreviewIssuer {
  name: string
  email?: string | null
  phone?: string | null
  website?: string | null
  address?: string | null
  taxNumber?: string | null
  taxLabel?: string | null
  bankName?: string | null
  bankBranch?: string | null
  bankAccountName?: string | null
  bankAccountNumber?: string | null
  iban?: string | null
  swiftCode?: string | null
  paypalEmail?: string | null
  paymentInstructions?: string | null
  invoiceFooter?: string | null
  logoUrl?: string | null
  primaryColor?: string | null
}

export interface PreviewDocument {
  kind: 'invoice' | 'quotation'
  number: string
  status?: string
  issueDate: string | Date
  dueDate: string | Date
  currency: string
  salesperson?: string | null
  completionDays?: string | null
  taxRate: number
  taxInclusive?: boolean
  discount: number
  subtotal: number
  discountAmount: number
  taxAmount: number
  total: number
  notes?: string | null
  items: { id?: string; code?: string | null; description: string; quantity: number; unitPrice: number; total: number }[]
  customer: { name: string; company?: string | null; taxNumber?: string | null; address?: string | null; phone?: string | null; email?: string | null }
  issuer: PreviewIssuer
}

const DEFAULT_FOOTER = 'THANK YOU FOR YOUR TIME AND CONSIDERATION IN OUR SERVICE!'

/** On-screen rendering of an invoice/quotation, mirroring the PDF layout. */
export function DocumentPreview({ doc, compact = false }: { doc: PreviewDocument; compact?: boolean }) {
  const { issuer, customer } = doc
  const color = issuer.primaryColor || '#0070c7'
  const taxLabel = issuer.taxLabel || 'VAT'
  const cur = doc.currency
  const title = doc.kind === 'invoice' ? 'Invoice' : 'Quotation'

  return (
    <div className={`relative card overflow-hidden ${compact ? 'p-5 sm:p-7' : 'p-5 sm:p-10'} shadow-elevated print:shadow-none`} id="invoice-print">
      <div aria-hidden className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: color }} />

      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-3 mb-1">
          {issuer.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={issuer.logoUrl} alt={`${issuer.name} logo`} className="max-h-12 max-w-[140px] object-contain" />
          ) : (
            <LogoMark className="w-10 h-10" />
          )}
          <h2 className="font-display text-xl font-bold" style={{ color }}>
            {issuer.name}
          </h2>
        </div>
      </div>

      <div className="text-center mb-8">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 border-b-2 border-slate-200 pb-3 inline-block px-8">{title}</h1>
        {doc.status && (
          <div className="mt-2">
            <StatusBadge status={doc.status as any} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8">
        <div className="rounded-xl bg-slate-50/70 border border-slate-200/70 p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] mb-2" style={{ color }}>
            From:
          </p>
          <p className="text-sm font-semibold text-slate-900">{issuer.name}</p>
          {issuer.taxNumber && (
            <p className="text-xs text-slate-700 font-semibold mt-1">
              {taxLabel === 'VAT' ? 'VAT TRN No.' : `${taxLabel} No.`} {issuer.taxNumber}
            </p>
          )}
          {issuer.address && <p className="text-xs text-slate-600 mt-1 leading-relaxed whitespace-pre-line">{issuer.address}</p>}
          {issuer.phone && <p className="text-xs text-slate-600">{issuer.phone}</p>}
          {issuer.email && <p className="text-xs text-slate-600">{issuer.email}</p>}
          {issuer.website && <p className="text-xs text-slate-600">{issuer.website}</p>}
        </div>
        <div className="rounded-xl bg-slate-50/70 border border-slate-200/70 p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] mb-2" style={{ color }}>
            To:
          </p>
          <p className="text-sm font-semibold text-slate-900">{customer.name}</p>
          {customer.company && <p className="text-xs text-slate-600">{customer.company}</p>}
          {customer.taxNumber && (
            <p className="text-xs text-slate-700 font-semibold mt-1">
              {taxLabel}: TRN:{customer.taxNumber}
            </p>
          )}
          {customer.address && <p className="text-xs text-slate-600 mt-1 leading-relaxed whitespace-pre-line">{customer.address}</p>}
          {customer.phone && <p className="text-xs text-slate-600">{customer.phone}</p>}
          {customer.email && <p className="text-xs text-slate-600">{customer.email}</p>}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200/80 p-4 sm:p-5 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <p className="font-display text-lg font-bold text-slate-900">
            {title} # <span className="font-mono">{doc.number}</span>
          </p>
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-xs text-slate-600">
            {doc.completionDays && (
              <div>
                <span className="font-semibold text-slate-700">Completion Days:</span> {doc.completionDays}
              </div>
            )}
            <div>
              <span className="font-semibold text-slate-700">{title} Date:</span> {formatDate(doc.issueDate)}
            </div>
            <div>
              <span className="font-semibold text-slate-700">{doc.kind === 'invoice' ? 'Due Date:' : 'Valid Until:'}</span> {formatDate(doc.dueDate)}
            </div>
            {doc.salesperson && (
              <div>
                <span className="font-semibold text-slate-700">Salesperson:</span> {doc.salesperson}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 overflow-x-auto rounded-xl border border-slate-200">
        <table className={compact ? 'w-full text-[13px]' : 'w-full min-w-[640px]'}>
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left text-xs font-bold text-slate-700 uppercase px-4 py-3 border-r border-slate-200">Code</th>
              <th className="text-left text-xs font-bold text-slate-700 uppercase px-4 py-3 border-r border-slate-200">Description</th>
              <th className="text-center text-xs font-bold text-slate-700 uppercase px-4 py-3 border-r border-slate-200 w-20">Quantity</th>
              <th className="text-center text-xs font-bold text-slate-700 uppercase px-4 py-3 border-r border-slate-200">Unit Price</th>
              <th className="text-center text-xs font-bold text-slate-700 uppercase px-4 py-3 border-r border-slate-200 w-28">Taxes</th>
              <th className="text-right text-xs font-bold text-slate-700 uppercase px-4 py-3 w-28">Total Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {doc.items.map((item, i) => (
              <tr key={item.id ?? i}>
                <td className="px-4 py-3 text-sm text-slate-600 border-r border-slate-200">{item.code || '-'}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{item.description}</td>
                <td className="px-4 py-3 text-sm text-slate-600 text-center border-l border-slate-200">{Number(item.quantity).toFixed(3)}</td>
                <td className="px-4 py-3 text-sm text-slate-600 text-center border-l border-slate-200">{formatCurrency(item.unitPrice, cur)}</td>
                <td className="px-4 py-3 text-xs text-slate-600 text-center border-l border-slate-200">
                  {taxLabel} {doc.taxRate}%
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-slate-900 text-right border-l border-slate-200">{formatCurrency(item.total, cur)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end mb-8">
        <div className="border border-slate-200 rounded-xl overflow-hidden w-full sm:w-80">
          <div className="flex justify-between px-4 py-2.5 bg-slate-50 text-sm">
            <span className="text-slate-600">Subtotal{doc.taxInclusive ? ` (incl. ${taxLabel})` : ''}</span>
            <span className="font-medium text-slate-900 tabular-nums">{formatCurrency(doc.subtotal, cur)}</span>
          </div>
          {doc.discount > 0 && (
            <div className="flex justify-between px-4 py-2.5 text-sm border-t border-slate-200">
              <span className="text-emerald-600">Discount ({doc.discount}%)</span>
              <span className="font-medium text-emerald-600 tabular-nums">-{formatCurrency(doc.discountAmount, cur)}</span>
            </div>
          )}
          <div className="flex justify-between px-4 py-2.5 text-sm border-t border-slate-200">
            <span className="text-slate-600">
              {taxLabel} {doc.taxRate}%{doc.taxInclusive ? ' included' : ''}
            </span>
            <span className="font-medium text-slate-900 tabular-nums">{formatCurrency(doc.taxAmount, cur)}</span>
          </div>
          <div className="flex justify-between px-4 py-3.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white font-bold text-base tabular-nums">
            <span>Total</span>
            <span>{formatCurrency(doc.total, cur)}</span>
          </div>
        </div>
      </div>

      {(issuer.bankName || issuer.paypalEmail || issuer.paymentInstructions) && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 mb-6">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">Terms</p>
          {issuer.paymentInstructions && <p className="text-xs text-slate-700 mb-3 whitespace-pre-line">{issuer.paymentInstructions}</p>}
          {issuer.bankName && (
            <div className="space-y-1 text-xs text-slate-700 mb-4">
              <p className="font-semibold">PAYMENT METHOD: CASH | CHEQUE | BANK TRANSFER</p>
              <p className="mt-2 font-semibold">TRANSFER DETAILS:</p>
              <p>
                BANK NAME: <span className="font-bold">{issuer.bankName}</span>
              </p>
              {issuer.bankAccountName && (
                <p>
                  ACCOUNT BENEFICIARY: <span className="font-bold">{issuer.bankAccountName}</span>
                </p>
              )}
              {(issuer.iban || issuer.bankAccountNumber) && (
                <p>
                  {[issuer.iban && `IBAN: ${issuer.iban}`, issuer.bankAccountNumber && `ACCOUNT NUMBER: ${issuer.bankAccountNumber}`, issuer.swiftCode && `SWIFT: ${issuer.swiftCode}`]
                    .filter(Boolean)
                    .join(' | ')}
                </p>
              )}
              {issuer.bankBranch && <p>BRANCH: {issuer.bankBranch}</p>}
              <p>Currency: {cur}</p>
            </div>
          )}
          {issuer.paypalEmail && (
            <div className="text-xs text-slate-700 pt-3 border-t border-slate-100">
              <p className="font-semibold">PayPal:</p>
              <p>PAYPAL ID: {issuer.paypalEmail}</p>
            </div>
          )}
        </div>
      )}

      {doc.notes && (
        <div className="border-t border-slate-100 pt-5 mb-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Notes</p>
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{doc.notes}</p>
        </div>
      )}

      <div className="text-center text-xs text-slate-400 pt-4 border-t border-slate-100">{issuer.invoiceFooter || DEFAULT_FOOTER}</div>
    </div>
  )
}
