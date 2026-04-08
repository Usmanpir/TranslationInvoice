'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Loader2, Edit2, Trash2, CheckCircle, XCircle, ArrowLeft, FileCheck } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { CurrencyCode } from '@/lib/utils'
import { InvoicePDFButton } from '@/components/pdf/InvoicePDFButton'
import { PaymentProofModal } from '@/components/PaymentProofModal'

export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [invoice, setInvoice] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const isAdmin = session?.user?.role === 'admin'

  useEffect(() => {
    fetch(`/api/invoices/${params.id}`)
      .then((r) => r.json())
      .then(setInvoice)
      .finally(() => setLoading(false))
  }, [params.id])

  const cur = (invoice?.currency || 'AED') as CurrencyCode

  const markUnpaid = async () => {
    const res = await fetch(`/api/invoices/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'PENDING', paymentProof: null }),
    })
    if (!res.ok) return
    const updated = await res.json()
    setInvoice(updated)
  }

  const handlePaymentProof = async (fileUrl: string) => {
    const res = await fetch(`/api/invoices/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'PAID', paymentProof: fileUrl }),
    })
    if (!res.ok) return
    const updated = await res.json()
    setInvoice(updated)
    setShowPaymentModal(false)
  }

  const handleDelete = async () => {
    if (!confirm('Delete this invoice?')) return
    await fetch(`/api/invoices/${params.id}`, { method: 'DELETE' })
    router.push('/invoices')
  }

  if (loading) return (
    <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-brand-600" /></div>
  )
  if (!invoice) return <div className="p-8 text-center text-slate-500">Invoice not found</div>

  const user = invoice.user
  const customer = invoice.customer

  return (
    <div>
      <PageHeader title={invoice.invoiceNumber} description={`Created ${formatDate(invoice.createdAt)}`}>
        <Link href="/invoices" className="btn-secondary"><ArrowLeft className="w-4 h-4" />Back</Link>
        {invoice.status === 'PAID' ? (
          <button onClick={markUnpaid} className="btn-secondary text-amber-600">
            <XCircle className="w-4 h-4" />Mark Unpaid
          </button>
        ) : (
          <button onClick={() => setShowPaymentModal(true)} className="btn-secondary text-emerald-600">
            <CheckCircle className="w-4 h-4" />Mark Paid
          </button>
        )}
        <InvoicePDFButton invoice={invoice} />
        <Link href={`/invoices/${params.id}/edit`} className="btn-secondary"><Edit2 className="w-4 h-4" />Edit</Link>
        {isAdmin && <button onClick={handleDelete} className="btn-danger"><Trash2 className="w-4 h-4" />Delete</button>}
      </PageHeader>

      <div className="p-8">
        <div className="max-w-4xl">
          <div className="card p-8 print:shadow-none" id="invoice-print">

            {/* Company Logo / Name centered */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 mb-1">
                <div className="w-10 h-10 bg-brand-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-bold">IF</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900">{user?.companyName || user?.name}</h2>
              </div>
            </div>

            {/* Title */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-slate-900 border-b-2 border-slate-200 pb-3 inline-block px-8">
                Invoice
              </h1>
              <div className="mt-2">
                <StatusBadge status={invoice.status} />
              </div>
            </div>

            {/* From / To two-column */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              {/* From */}
              <div className="border border-slate-200 rounded-lg p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">From:</p>
                <p className="text-sm font-semibold text-slate-900">{user?.companyName || user?.name}</p>
                {user?.taxNumber && (
                  <p className="text-xs text-slate-700 font-semibold mt-1">VAT TRN No. {user.taxNumber}</p>
                )}
                {user?.address && <p className="text-xs text-slate-600 mt-1 leading-relaxed">{user.address}</p>}
                {user?.phone && <p className="text-xs text-slate-600">{user.phone}</p>}
                {user?.email && <p className="text-xs text-slate-600">{user.email}</p>}
              </div>

              {/* To */}
              <div className="border border-slate-200 rounded-lg p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">To:</p>
                <p className="text-sm font-semibold text-slate-900">{customer?.name}</p>
                {customer?.company && <p className="text-xs text-slate-600">{customer.company}</p>}
                {customer?.taxNumber && (
                  <p className="text-xs text-slate-700 font-semibold mt-1">VAT: TRN:{customer.taxNumber}</p>
                )}
                {customer?.address && <p className="text-xs text-slate-600 mt-1 leading-relaxed">{customer.address}</p>}
                {customer?.phone && <p className="text-xs text-slate-600">{customer.phone}</p>}
                {customer?.email && <p className="text-xs text-slate-600">{customer.email}</p>}
              </div>
            </div>

            {/* Invoice Number + Meta row */}
            <div className="border border-slate-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-lg font-bold text-slate-900">Invoice # {invoice.invoiceNumber}</p>
                </div>
                <div className="flex gap-8 text-xs text-slate-600">
                  {invoice.completionDays && (
                    <div><span className="font-semibold text-slate-700">Completion Days:</span> {invoice.completionDays}</div>
                  )}
                  <div><span className="font-semibold text-slate-700">Invoice Date:</span> {formatDate(invoice.issueDate)}</div>
                  <div><span className="font-semibold text-slate-700">Due Date:</span> {formatDate(invoice.dueDate)}</div>
                  {invoice.salesperson && (
                    <div><span className="font-semibold text-slate-700">Salesperson:</span> {invoice.salesperson}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full mb-6 border border-slate-200">
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
                {invoice.items?.map((item: any) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-sm text-slate-600 border-r border-slate-200">{item.code || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{item.description}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-center border-l border-slate-200">{item.quantity.toFixed(3)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-center border-l border-slate-200">{formatCurrency(item.unitPrice, cur)}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 text-center border-l border-slate-200">
                      VAT {invoice.taxRate}%
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900 text-right border-l border-slate-200">{formatCurrency(item.total, cur)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end mb-8">
              <div className="border border-slate-200 rounded-lg overflow-hidden w-72">
                <div className="flex justify-between px-4 py-2.5 bg-slate-50 text-sm">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-medium text-slate-900">{formatCurrency(invoice.subtotal, cur)}</span>
                </div>
                {invoice.discount > 0 && (
                  <div className="flex justify-between px-4 py-2.5 text-sm border-t border-slate-200">
                    <span className="text-emerald-600">Discount ({invoice.discount}%)</span>
                    <span className="font-medium text-emerald-600">-{formatCurrency(invoice.discountAmount, cur)}</span>
                  </div>
                )}
                <div className="flex justify-between px-4 py-2.5 text-sm border-t border-slate-200">
                  <span className="text-slate-600">VAT {invoice.taxRate}%</span>
                  <span className="font-medium text-slate-900">{formatCurrency(invoice.taxAmount, cur)}</span>
                </div>
                {user?.taxNumber && (
                  <div className="px-4 py-1 text-[10px] text-slate-400">{user.taxNumber}</div>
                )}
                <div className="flex justify-between px-4 py-3 bg-slate-900 text-white font-bold text-base">
                  <span>Total</span>
                  <span>{formatCurrency(invoice.total, cur)}</span>
                </div>
              </div>
            </div>

            {/* Payment Terms / Bank Details */}
            {(user?.bankName || user?.paypalEmail) && (
              <div className="border border-slate-200 rounded-lg p-5 mb-6">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">Terms</p>

                {user?.bankName && (
                  <div className="space-y-1 text-xs text-slate-700 mb-4">
                    <p className="font-semibold">PAYMENT METHOD: CASH | CHEQUE | BANK TRANSFER</p>
                    <p className="mt-2 font-semibold">TRANSFER DETAILS:</p>
                    <p>BANK NAME: <span className="font-bold">{user.bankName}</span></p>
                    {user.bankAccountName && <p>ACCOUNT BENEFICIARY: <span className="font-bold">{user.bankAccountName}</span></p>}
                    {user.iban && user.bankAccountNumber && (
                      <p>IBAN: {user.iban} | ACCOUNT NUMBER: {user.bankAccountNumber}{user.swiftCode ? ` | SWIFT: ${user.swiftCode}` : ''}</p>
                    )}
                    {user.bankBranch && <p>BRANCH: {user.bankBranch}</p>}
                    <p>Currency: {invoice.currency}</p>
                  </div>
                )}

                {user?.paypalEmail && (
                  <div className="text-xs text-slate-700 pt-3 border-t border-slate-100">
                    <p className="font-semibold">PayPal:</p>
                    <p>PAYPAL ID: {user.paypalEmail}</p>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            {invoice.notes && (
              <div className="border-t border-slate-100 pt-5 mb-6">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Notes</p>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-xs text-slate-400 pt-4 border-t border-slate-100">
              THANK YOU FOR YOUR TIME AND CONSIDERATION IN OUR SERVICE!
            </div>

            {/* Payment Proof */}
            {invoice.paymentProof && (
              <div className="mt-8 pt-6 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  <FileCheck className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />
                  Payment Proof
                </p>
                {invoice.paymentProof.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                  <a href={invoice.paymentProof} target="_blank" rel="noopener noreferrer">
                    <img
                      src={invoice.paymentProof}
                      alt="Payment proof"
                      className="max-h-60 rounded-lg border border-slate-200 object-contain hover:opacity-90 transition-opacity"
                    />
                  </a>
                ) : (
                  <a
                    href={invoice.paymentProof}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-brand-600 hover:bg-slate-100 transition-colors"
                  >
                    <FileCheck className="w-4 h-4" />
                    View payment proof document
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Proof Modal */}
      {showPaymentModal && (
        <PaymentProofModal
          invoiceNumber={invoice.invoiceNumber}
          onConfirm={handlePaymentProof}
          onClose={() => setShowPaymentModal(false)}
        />
      )}
    </div>
  )
}
