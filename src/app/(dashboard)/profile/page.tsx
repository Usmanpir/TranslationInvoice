'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Loader2, Save, User, Building2, Landmark, CreditCard } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'

export default function ProfilePage() {
  const { data: session, update } = useSession()
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    address: '',
    phone: '',
    taxNumber: '',
    bankName: '',
    bankBranch: '',
    bankAccountName: '',
    bankAccountNumber: '',
    iban: '',
    swiftCode: '',
    paypalEmail: '',
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
            bankName: data.bankName || '',
            bankBranch: data.bankBranch || '',
            bankAccountName: data.bankAccountName || '',
            bankAccountNumber: data.bankAccountNumber || '',
            iban: data.iban || '',
            swiftCode: data.swiftCode || '',
            paypalEmail: data.paypalEmail || '',
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
      <PageHeader title="Settings" description="Manage your account, company, and payment details" />
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
                    <input type="tel" value={formData.phone} onChange={update2('phone')} className="input" placeholder="+971 55 000 0000" />
                  </div>
                  <div>
                    <label className="label">VAT / TRN Number</label>
                    <input type="text" value={formData.taxNumber} onChange={update2('taxNumber')} className="input" placeholder="100287522500003" />
                  </div>
                </div>
                <div>
                  <label className="label">Address</label>
                  <textarea value={formData.address} onChange={update2('address')} className="input resize-none" rows={3} placeholder="Street, City, Country" />
                </div>
              </div>
            </div>

            {/* Bank Details */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-5">
                <Landmark className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-700">Bank / Transfer Details</h3>
              </div>
              <p className="text-xs text-slate-400 mb-4">These details appear on your invoices under the payment terms section.</p>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Bank Name</label>
                    <input type="text" value={formData.bankName} onChange={update2('bankName')} className="input" placeholder="Mashreq Bank" />
                  </div>
                  <div>
                    <label className="label">Branch</label>
                    <input type="text" value={formData.bankBranch} onChange={update2('bankBranch')} className="input" placeholder="Dubai Mall BR 022" />
                  </div>
                </div>
                <div>
                  <label className="label">Account Beneficiary Name</label>
                  <input type="text" value={formData.bankAccountName} onChange={update2('bankAccountName')} className="input" placeholder="Universal Translation Services" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Account Number</label>
                    <input type="text" value={formData.bankAccountNumber} onChange={update2('bankAccountNumber')} className="input" placeholder="019100103530" />
                  </div>
                  <div>
                    <label className="label">SWIFT Code</label>
                    <input type="text" value={formData.swiftCode} onChange={update2('swiftCode')} className="input" placeholder="BOMLAEAD" />
                  </div>
                </div>
                <div>
                  <label className="label">IBAN</label>
                  <input type="text" value={formData.iban} onChange={update2('iban')} className="input" placeholder="AE150330000019100103530" />
                </div>
              </div>
            </div>

            {/* PayPal */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-5">
                <CreditCard className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-700">PayPal</h3>
              </div>
              <div>
                <label className="label">PayPal Email / ID</label>
                <input type="email" value={formData.paypalEmail} onChange={update2('paypalEmail')} className="input" placeholder="payments@company.com" />
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
