'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { ArrowLeft, ArrowRight, Building2, Eye, EyeOff, Loader2, Lock, Mail, Phone, User } from 'lucide-react'
import { AuthShell } from '@/components/auth/AuthShell'
import { Alert } from '@/components/ui/States'
import { api, errorMessage } from '@/lib/api-client'
import { CURRENCIES } from '@/lib/utils'
import { COUNTRIES } from '@/lib/countries'
import { TRIAL, PLANS } from '@/lib/plans'

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    companyName: '',
    country: 'AE',
    phone: '',
    currency: 'AED',
    taxNumber: '',
    address: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const toStep2 = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
      return setError('Use at least one letter and one number in your password.')
    }
    setStep(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api('/api/auth/register', { body: form })
      const res = await signIn('credentials', { email: form.email, password: form.password, redirect: false })
      if (res?.error) {
        router.push('/login')
        return
      }
      router.push('/onboarding')
      router.refresh()
    } catch (err) {
      setError(errorMessage(err, 'Registration failed. Please try again.'))
      setLoading(false)
    }
  }

  const iconCls = 'absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none'

  return (
    <AuthShell
      title={step === 1 ? 'Create your account' : 'Tell us about your business'}
      subtitle={step === 1 ? `Start your ${TRIAL.days}-day ${PLANS[TRIAL.plan].name} trial — no card required` : 'This creates your InvoiceFlow workspace'}
    >
      <div className="flex items-center gap-2 mb-6" aria-label={`Step ${step} of 2`}>
        <div className="h-1.5 flex-1 rounded-full bg-brand-600" />
        <div className={`h-1.5 flex-1 rounded-full ${step === 2 ? 'bg-brand-600' : 'bg-slate-200'}`} />
      </div>

      {step === 1 ? (
        <form onSubmit={toStep2} className="space-y-4">
          {error && <Alert>{error}</Alert>}
          <div>
            <label className="label" htmlFor="name">Full name</label>
            <div className="relative">
              <User className={iconCls} />
              <input id="name" value={form.name} onChange={set('name')} className="input h-11 pl-10" placeholder="Alex Johnson" autoComplete="name" required minLength={2} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="email">Work email</label>
            <div className="relative">
              <Mail className={iconCls} />
              <input id="email" type="email" value={form.email} onChange={set('email')} className="input h-11 pl-10" placeholder="you@company.com" autoComplete="email" required />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <div className="relative">
              <Lock className={iconCls} />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={set('password')}
                className="input h-11 pl-10 pr-11"
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                required
                minLength={8}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-1.5 top-1/2 -translate-y-1/2 icon-btn">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="hint">At least 8 characters with a letter and a number.</p>
          </div>
          <button type="submit" className="btn-primary w-full h-11 mt-2 group">
            Continue
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert>{error}</Alert>}
          <div>
            <label className="label" htmlFor="companyName">Business / company name</label>
            <div className="relative">
              <Building2 className={iconCls} />
              <input id="companyName" value={form.companyName} onChange={set('companyName')} className="input h-11 pl-10" placeholder="Acme Trading LLC" autoComplete="organization" required minLength={2} autoFocus />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="country">Country</label>
              <select id="country" value={form.country} onChange={set('country')} className="input h-11">
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="currency">Currency</label>
              <select id="currency" value={form.currency} onChange={set('currency')} className="input h-11">
                {Object.values(CURRENCIES).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="phone">Phone <span className="font-normal text-slate-400">(optional)</span></label>
              <div className="relative">
                <Phone className={iconCls} />
                <input id="phone" value={form.phone} onChange={set('phone')} className="input h-11 pl-10" placeholder="+971…" autoComplete="tel" />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="trn">VAT / TRN <span className="font-normal text-slate-400">(optional)</span></label>
              <input id="trn" value={form.taxNumber} onChange={set('taxNumber')} className="input h-11" placeholder="1002…" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="address">Business address <span className="font-normal text-slate-400">(optional)</span></label>
            <textarea id="address" value={form.address} onChange={set('address')} rows={2} className="input resize-none" placeholder="Business Bay, Dubai" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setStep(1)} className="btn-secondary h-11">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 h-11 group">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Create workspace
              {!loading && <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />}
            </button>
          </div>
          <p className="text-xs text-slate-400 text-center">
            By creating an account you agree to our{' '}
            <Link href="/terms" className="underline hover:text-slate-600">Terms</Link> and{' '}
            <Link href="/privacy" className="underline hover:text-slate-600">Privacy Policy</Link>.
          </p>
        </form>
      )}

      <p className="text-center text-sm text-slate-500 mt-8">
        Already have an account?{' '}
        <Link href="/login" className="text-brand-600 font-semibold hover:text-brand-700">
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}
