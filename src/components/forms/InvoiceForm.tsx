'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2, Save, Calculator } from 'lucide-react'
import { formatCurrency, calculateInvoiceTotals } from '@/lib/utils'

interface Item {
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
  const [taxRate, setTaxRate] = useState(initialData?.taxRate ?? 10)
  const [discount, setDiscount] = useState(initialData?.discount ?? 0)
  const [items, setItems] = useState<Item[]>(
    initialData?.items?.map((i: any) => ({
      description: i.description,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
    })) || [{ description: '', quantity: 1, unitPrice: 0 }]
  )

  useEffect(() => {
    fetch('/api/customers?limit=100')
      .then((r) => r.json())
      .then((d) => setCustomers(d.customers || []))
  }, [])

  const addItem = () => setItems([...items, { description: '', quantity: 1, unitPrice: 0 }])
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i))
  const updateItem = (i: number, field: keyof Item, value: string | number) =>
    setItems(items.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)))

  const totals = calculateInvoiceTotals(items, taxRate, discount)
  const isQuotation = type === 'quotation'

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
        body: JSON.stringify({ customerId, [dateKey]: dueDate, notes, taxRate, discount, items }),
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

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl space-y-5">
      {error && <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

      {/* Header fields */}
      <div className="card p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Details</h3>
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
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input" required />
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Line Items</h3>
          <button type="button" onClick={addItem} className="btn-secondary text-xs px-3 py-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Item
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left text-xs font-medium text-slate-500 px-6 py-3">Description</th>
                <th className="text-left text-xs font-medium text-slate-500 px-4 py-3 w-24">Qty</th>
                <th className="text-left text-xs font-medium text-slate-500 px-4 py-3 w-32">Unit Price</th>
                <th className="text-right text-xs font-medium text-slate-500 px-6 py-3 w-28">Total</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map((item, i) => (
                <tr key={i}>
                  <td className="px-6 py-3">
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
                      className="input text-sm"
                      min="0.01"
                      step="0.01"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(i, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="input text-sm pl-6"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <span className="text-sm font-medium text-slate-900">
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </span>
                  </td>
                  <td className="pr-3 py-3">
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(i)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="border-t border-slate-100 px-6 py-5">
          <div className="flex gap-8 justify-end">
            <div className="flex flex-col gap-2 text-sm min-w-[200px]">
              <div className="flex items-center gap-4">
                <label className="text-slate-500 flex-1">Discount (%)</label>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="input w-24 text-right text-sm py-1.5"
                  min="0" max="100" step="0.1"
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="text-slate-500 flex-1">Tax rate (%)</label>
                <input
                  type="number"
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="input w-24 text-right text-sm py-1.5"
                  min="0" max="100" step="0.1"
                />
              </div>
              <div className="border-t border-slate-200 pt-2 mt-1 space-y-1.5">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span><span>{formatCurrency(totals.subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount ({discount}%)</span><span>-{formatCurrency(totals.discountAmount)}</span>
                  </div>
                )}
                {taxRate > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Tax ({taxRate}%)</span><span>{formatCurrency(totals.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-900 text-base pt-1 border-t border-slate-200">
                  <span>Total</span><span>{formatCurrency(totals.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="card p-6">
        <label className="label">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="input resize-none"
          rows={3}
          placeholder="Payment terms, special instructions, thank you message..."
        />
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {initialData?.id ? 'Update' : 'Create'} {isQuotation ? 'Quotation' : 'Invoice'}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">Cancel</button>
      </div>
    </form>
  )
}
