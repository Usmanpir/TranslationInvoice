'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save, UserRound, Building2 } from 'lucide-react'
import { Alert } from '@/components/ui/States'
import { FormSection } from './FormSection'

interface CustomerFormProps {
  initialData?: {
    id?: string
    name?: string
    email?: string
    phone?: string
    address?: string
    company?: string
    taxNumber?: string
  }
}

export function CustomerForm({ initialData }: CustomerFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    address: initialData?.address || '',
    company: initialData?.company || '',
    taxNumber: initialData?.taxNumber || '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const isEdit = !!initialData?.id
    const url = isEdit ? `/api/customers/${initialData.id}` : '/api/customers'
    const method = isEdit ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to save customer')
      } else {
        router.push('/customers')
        router.refresh()
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFormData((prev) => ({ ...prev, [field]: e.target.value }))

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-5 animate-fade-up">
      {error && <Alert>{error}</Alert>}

      <FormSection icon={UserRound} title="Contact" description="How you reach this customer">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Full name *</label>
            <input type="text" value={formData.name} onChange={update('name')} className="input" placeholder="John Doe" required />
          </div>
          <div>
            <label className="label">Email address *</label>
            <input type="email" value={formData.email} onChange={update('email')} className="input" placeholder="john@company.com" required />
          </div>
          <div className="sm:col-span-2 sm:max-w-[calc(50%-0.5rem)]">
            <label className="label">Phone *</label>
            <input type="tel" value={formData.phone} onChange={update('phone')} className="input" placeholder="+1 (555) 000-0000" required />
          </div>
        </div>
      </FormSection>

      <FormSection icon={Building2} title="Business" description="Shown on invoices and quotations">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Company</label>
              <input type="text" value={formData.company} onChange={update('company')} className="input" placeholder="Company Inc." />
            </div>
            <div>
              <label className="label">Tax / VAT number</label>
              <input type="text" value={formData.taxNumber} onChange={update('taxNumber')} className="input" placeholder="TAX-123456789" />
            </div>
          </div>
          <div>
            <label className="label">Address</label>
            <textarea
              value={formData.address}
              onChange={update('address')}
              className="input resize-none"
              rows={3}
              placeholder="123 Business St, City, State ZIP"
            />
          </div>
        </div>
      </FormSection>

      <div className="flex items-center gap-3 pt-1">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {initialData?.id ? 'Update Customer' : 'Create Customer'}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">Cancel</button>
      </div>
    </form>
  )
}
