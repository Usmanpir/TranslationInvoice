'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2, Save, FileText, ListChecks, StickyNote } from 'lucide-react'
import { formatCurrency, calculateInvoiceTotals, CURRENCIES, type CurrencyCode } from '@/lib/utils'
import { DatePicker } from '@/components/ui/DatePicker'
import { Alert } from '@/components/ui/States'
import { FormSection } from './FormSection'

interface Item {
  code: string
  description: string
  quantity: number
  unitPrice: number
}

interface InvoiceFormProps {
  type?: 'invoice' | 'quotation'
  initialData?: any
}

export function InvoiceForm({ type = 'invoice', initialData }: InvoiceFormProps) {
  const router = useRouter()
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [customerId, setCustomerId] = useState(initialData?.customerId || '')
  const dueDateDefault = initialData?.dueDate
    ? new Date(initialData.dueDate).toISOString().split('T')[0]
    : new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  const [dueDate, setDueDate] = useState(dueDateDefault)
  const [notes, setNotes] = useState(initialData?.notes || '')
  const [taxRate, setTaxRate] = useState(initialData?.taxRate ?? 5)
  const [discount, setDiscount] = useState(initialData?.discount ?? 0)
  const [currency, setCurrency] = useState<CurrencyCode>(initialData?.currency || 'AED')
  const [salesperson, setSalesperson] = useState(initialData?.salesperson || '')
  const [completionDays, setCompletionDays] = useState(initialData?.completionDays || '')
  const [items, setItems] = useState<Item[]>(
    initialData?.items?.map((i: any) => ({
      code: i.code || '',
      description: i.description,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
    })) || [{ code: '', description: '', quantity: 1, unitPrice: 0 }]
  )

  useEffect(() => {
    fetch('/api/customers?limit=100')
      .then((r) => r.json())
      .then((d) => setCustomers(d.customers || []))
  }, [])

  const addItem = () => setItems([...items, { code: '', description: '', quantity: 1, unitPrice: 0 }])
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i))
  const updateItem = (i: number, field: keyof Item, value: string | number) =>
    setItems(items.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)))

  const totals = calculateInvoiceTotals(items, taxRate, discount)
  const isQuotation = type === 'quotation'

  const currencySymbol = CURRENCIES[currency].symbol

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerId) { setError('Please select a customer'); return }
    if (items.some(i => !i.description)) { setError('All items must have a description'); return }

    setError('')
    setLoading(true)

    const endpoint = isQuotation ? '/api/quotations' : '/api/invoices'
    const editEndpoint = initialData?.id ? `${endpoint}/${initialData.id}` : endpoint
    const method = initialData?.id ? 'PUT' : 'POST'
    const dateKey = isQuotation ? 'validUntil' : 'dueDate'

    try {
      const res = await fetch(editEndpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          [dateKey]: dueDate,
          notes,
          taxRate,
          discount,
          currency,
          salesperson: salesperson || undefined,
          completionDays: completionDays || undefined,
          items,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to save')
      } else {
        router.push(isQuotation ? '/quotations' : '/invoices')
        router.refresh()
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const th = 'text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 px-4 py-3'

  return (
    <form onSubmit={handleSubmit} className="max-w-5xl space-y-5 lg:space-y-6 animate-fade-up">
      {error && <Alert>{error}</Alert>}

      {/* Header fields */}
      <FormSection
        icon={FileText}
        title="Details"
        description={isQuotation ? 'Who the quotation is for and how long it is valid' : 'Who you are billing and when payment is due'}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Customer *</label>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="input" required>
              <option value="">Select a customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{isQuotation ? 'Valid Until' : 'Due Date'} *</label>
            <DatePicker
              value={dueDate}
              onChange={setDueDate}
              placeholder={isQuotation ? 'Select validity date' : 'Select due date'}
              required
              ariaLabel={isQuotation ? 'Valid until' : 'Due date'}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <div>
            <label className="label">Currency *</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)} className="input">
              {Object.values(CURRENCIES).map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Salesperson</label>
            <input type="text" value={salesperson} onChange={(e) => setSalesperson(e.target.value)} className="input" placeholder="Name of salesperson" />
          </div>
          <div>
            <label className="label">Completion Days</label>
            <input type="text" value={completionDays} onChange={(e) => setCompletionDays(e.target.value)} className="input" placeholder="e.g. 7 days" />
          </div>
        </div>
      </FormSection>

      {/* Items */}
      <section className="card overflow-hidden">
        <div className="card-header">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 ring-1 ring-inset ring-brand-100 flex items-center justify-center">
              <ListChecks className="w-4 h-4 text-brand-600" />
            </div>
            <div>
              <h3 className="section-title">Line Items</h3>
              <p className="section-desc">{items.length} item{items.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button type="button" onClick={addItem} className="btn-secondary btn-sm">
            <Plus className="w-3.5 h-3.5" /> Add Item
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-slate-200/70 bg-slate-50/80">
                <th className={`${th} w-36`}>Code</th>
                <th className={th}>Description</th>
                <th className={`${th} w-24`}>Qty</th>
                <th className={`${th} w-36`}>Unit Price</th>
                <th className={`${th} w-24`}>Tax</th>
                <th className={`${th} !text-right w-32`}>Total</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={item.code}
                      onChange={(e) => updateItem(i, 'code', e.target.value)}
                      className="input text-sm"
                      placeholder="e.g. EN-AR"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(i, 'description', e.target.value)}
                      className="input text-sm"
                      placeholder="Service or product description"
                      required
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)}
                      className="input text-sm tabular-nums"
                      min="0.01"
                      step="0.001"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium pointer-events-none">{currencySymbol}</span>
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(i, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="input text-sm pl-11 tabular-nums"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center h-6 px-2 rounded-md bg-slate-100 text-[11px] font-semibold text-slate-600 whitespace-nowrap">
                      VAT {taxRate}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                      {formatCurrency(item.quantity * item.unitPrice, currency)}
                    </span>
                  </td>
                  <td className="pr-3 py-3">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(i)}
                        className="icon-btn hover:text-red-500 hover:bg-red-50"
                        title="Remove item"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={addItem}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-slate-500 border-t border-dashed border-slate-200 hover:text-brand-600 hover:bg-brand-50/40 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add another line
        </button>

        {/* Totals */}
        <div className="border-t border-slate-100 bg-slate-50/50 px-5 sm:px-6 py-5">
          <div className="flex justify-end">
            <div className="w-full sm:w-80 rounded-xl bg-white border border-slate-200/80 shadow-card overflow-hidden text-sm">
              <div className="p-4 space-y-2">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span className="tabular-nums text-slate-700">{formatCurrency(totals.subtotal, currency)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount ({discount}%)</span>
                    <span className="tabular-nums">-{formatCurrency(totals.discountAmount, currency)}</span>
                  </div>
                )}
                {taxRate > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>VAT ({taxRate}%)</span>
                    <span className="tabular-nums text-slate-700">{formatCurrency(totals.taxAmount, currency)}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center px-4 py-3.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
                <span className="font-medium">Total</span>
                <span className="font-display text-lg font-bold tabular-nums">{formatCurrency(totals.total, currency)}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Notes */}
      <FormSection icon={StickyNote} title="Notes / Terms" description="Optional — payment terms, instructions or a thank-you message">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="input resize-none"
          rows={3}
          placeholder="Payment terms, special instructions, thank you message..."
          aria-label="Notes / Terms (optional)"
        />
      </FormSection>

      {/* Action bar */}
      <div className="sticky bottom-0 z-10 -mx-4 sm:mx-0 px-4 sm:px-5 py-3.5 sm:rounded-2xl bg-white/85 backdrop-blur-xl border-t sm:border border-slate-200/70 shadow-[0_-8px_30px_-12px_rgb(15_23_42/0.15)] flex items-center justify-between gap-3">
        <div className="hidden sm:block text-sm text-slate-500">
          Total <span className="font-display font-bold text-slate-900 tabular-nums ml-1">{formatCurrency(totals.total, currency)}</span>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button type="button" onClick={() => router.back()} className="btn-secondary flex-1 sm:flex-none">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1 sm:flex-none">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {initialData?.id ? 'Update' : 'Create'} {isQuotation ? 'Quotation' : 'Invoice'}
          </button>
        </div>
      </div>
    </form>
  )
}
