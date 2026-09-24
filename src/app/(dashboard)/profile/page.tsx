'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Loader2, Save, User, Lock } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Alert } from '@/components/ui/States'
import { FormSection } from '@/components/forms/FormSection'

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

  const initial = (formData.name || session?.user?.name || '?')[0]?.toUpperCase()

  return (
    <div>
      <PageHeader title="Settings" description="Manage your account, company, and payment details" />
      <div className="p-4 sm:p-6 lg:p-10">
        <div className="max-w-2xl space-y-5 animate-fade-up">
          {/* Profile banner */}
          <div className="card overflow-hidden">
            <div className="relative h-24 bg-gradient-to-r from-brand-500 via-indigo-500 to-violet-500">
              <div aria-hidden className="absolute inset-0 bg-grid-dark opacity-50" />
            </div>
            <div className="relative px-5 sm:px-6 pb-5 flex items-end gap-4">
              <div className="relative -mt-10 flex-shrink-0 w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-400 to-indigo-600 ring-4 ring-white shadow-elevated flex items-center justify-center text-white font-display text-2xl font-bold">
                {initial}
              </div>
              <div className="min-w-0 pb-1">
                <p className="font-display text-lg font-bold text-slate-900 truncate">{formData.name || session?.user?.name}</p>
                <p className="text-sm text-slate-500 truncate">{session?.user?.email}</p>
              </div>
              {session?.user?.role && (
                <span className="ml-auto mb-1.5 badge bg-slate-50 text-slate-600 border-slate-200 capitalize">
                  {session.user.role}
                </span>
              )}
            </div>
          </div>

          {error && <Alert>{error}</Alert>}
          {success && <Alert variant="success">Settings saved successfully!</Alert>}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Personal Info */}
            <FormSection icon={User} title="Personal Information" description="Your name as it appears across the app">
              <div className="space-y-4">
                <div>
                  <label className="label">Full name</label>
                  <input type="text" value={formData.name} onChange={update2('name')} className="input" placeholder="Your name" />
                </div>
                <div>
                  <label className="label">Email address</label>
                  <div className="relative">
                    <input type="email" value={session?.user?.email || ''} className="input pr-10 cursor-not-allowed" disabled />
                    <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <p className="hint">Email cannot be changed</p>
                </div>
              </div>
            </FormSection>

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
