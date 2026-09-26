'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Building2, Loader2 } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { Alert } from '@/components/ui/States'
import { api, errorMessage } from '@/lib/api-client'
import { CURRENCIES } from '@/lib/utils'
import { COUNTRIES } from '@/lib/countries'

export function CreateWorkspace({ firstWorkspace, userName }: { firstWorkspace: boolean; userName: string }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [country, setCountry] = useState('AE')
  const [currency, setCurrency] = useState('AED')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const org = await api<{ id: string }>('/api/organizations', { body: { name, country, currency } })
      await api('/api/organizations', { method: 'PUT', body: { organizationId: org.id } })
      router.push('/onboarding')
      router.refresh()
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-up">
        <div className="mb-8 flex items-center justify-between gap-2">
          <Logo />
          <ThemeToggle className="ml-auto" />
          {!firstWorkspace && (
            <Link href="/dashboard" className="btn-ghost text-sm">
              <ArrowLeft className="w-4 h-4" /> Back
            </Link>
          )}
        </div>
        <div className="card p-6 sm:p-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-brand-600/25">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-bold text-slate-900 tracking-tight">
            {firstWorkspace ? `Welcome, ${userName.split(' ')[0]}` : 'Create a new workspace'}
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            {firstWorkspace
              ? "You're not part of a workspace yet. Create one for your business to get started."
              : 'Each workspace has its own customers, invoices, team and billing.'}
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            {error && <Alert>{error}</Alert>}
            <div>
              <label className="label" htmlFor="org-name">Business name</label>
              <input id="org-name" value={name} onChange={(e) => setName(e.target.value)} className="input h-11" placeholder="Acme Trading LLC" required minLength={2} maxLength={160} autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="org-country">Country</label>
                <select id="org-country" value={country} onChange={(e) => setCountry(e.target.value)} className="input h-11">
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="org-currency">Currency</label>
                <select id="org-currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className="input h-11">
                  {Object.values(CURRENCIES).map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button type="submit" disabled={busy} className="btn-primary w-full h-11">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Create workspace <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
