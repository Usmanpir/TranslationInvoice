'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Loader2, Save, User, Building2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'

export default function ProfilePage() {
  const { data: session, update } = useSession()
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    address: '',
    phone: '',
    taxNumber: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (session?.user) {
      fetch('/api/profile')
        .then((r) => r.json())
        .then((data) => {
          setFormData({
            name: data.name || '',
            companyName: data.companyName || '',
            address: data.address || '',
            phone: data.phone || '',
            taxNumber: data.taxNumber || '',
          })
        })
    }
  }, [session])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        setSuccess(true)
        await update({ name: formData.name, companyName: formData.companyName })
        setTimeout(() => setSuccess(false), 3000)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to update')
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const update2 = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFormData((prev) => ({ ...prev, [field]: e.target.value }))

  return (
    <div>
      <PageHeader title="Settings" description="Manage your account and company details" />
      <div className="p-8">
        <div className="max-w-2xl space-y-5">
          {error && <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
          {success && <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">Settings saved successfully!</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Personal Info */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-5">
                <User className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-700">Personal Information</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="label">Full name</label>
                  <input type="text" value={formData.name} onChange={update2('name')} className="input" placeholder="Your name" />
                </div>
                <div>
                  <label className="label">Email address</label>
                  <input type="email" value={session?.user?.email || ''} className="input opacity-60 cursor-not-allowed" disabled />
                  <p className="text-xs text-slate-400 mt-1">Email cannot be changed</p>
                </div>
              </div>
            </div>

            {/* Company Info */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-5">
                <Building2 className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-700">Company Details</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="label">Company name</label>
                  <input type="text" value={formData.companyName} onChange={update2('companyName')} className="input" placeholder="Company Inc." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Phone</label>
                    <input type="tel" value={formData.phone} onChange={update2('phone')} className="input" placeholder="+1 (555) 000-0000" />
                  </div>
                  <div>
                    <label className="label">Tax / VAT Number</label>
                    <input type="text" value={formData.taxNumber} onChange={update2('taxNumber')} className="input" placeholder="TAX-123456789" />
                  </div>
                </div>
                <div>
                  <label className="label">Address</label>
                  <textarea value={formData.address} onChange={update2('address')} className="input resize-none" rows={3} placeholder="123 Business St, City, State ZIP" />
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
