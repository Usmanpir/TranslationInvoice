'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  FileText,
  Loader2,
  Mail,
  PartyPopper,
  Plus,
  Receipt,
  Sparkles,
  Trash2,
  UsersRound,
} from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { Alert } from '@/components/ui/States'
import { LogoUploader } from '@/components/settings/LogoUploader'
import { api, errorMessage } from '@/lib/api-client'
import { cn, CURRENCIES } from '@/lib/utils'
import { ROLE_LABELS } from '@/lib/permissions'

interface OrgDraft {
  name: string
  email: string | null
  phone: string | null
  website: string | null
  address: string | null
  country: string
  taxNumber: string | null
  logoUploadId: string | null
  logoUrl: string | null
  defaultCurrency: string
  defaultTaxRate: number
  invoicePrefix: string
  invoiceNextNumber: number
  paymentTermsDays: number
  defaultNotes: string | null
}

const STEPS = [
  { id: 'welcome', label: 'Welcome', icon: Sparkles },
  { id: 'business', label: 'Business', icon: Building2 },
  { id: 'invoice', label: 'Invoices', icon: FileText },
  { id: 'team', label: 'Team', icon: UsersRound },
  { id: 'done', label: 'Done', icon: CheckCircle2 },
] as const

type InviteRow = { email: string; role: 'ADMIN' | 'ACCOUNTANT' | 'SALES' | 'VIEWER' }

export function OnboardingWizard({
  userName,
  organization,
  canBrand,
  trialDays,
  planName,
}: {
  userName: string
  organization: OrgDraft
  canBrand: boolean
  trialDays: number | null
  planName: string
}) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [org, setOrg] = useState<OrgDraft>(organization)
  const [invites, setInvites] = useState<InviteRow[]>([{ email: '', role: 'SALES' }])
  const [sent, setSent] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const set = <K extends keyof OrgDraft>(key: K, value: OrgDraft[K]) => setOrg((o) => ({ ...o, [key]: value }))
  const text = (key: keyof OrgDraft) => ({
    value: (org[key] as string | null) ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(key, e.target.value as never),
  })

  const next = () => {
    setError('')
    setStep((s) => Math.min(STEPS.length - 1, s + 1))
  }
  const back = () => {
    setError('')
    setStep((s) => Math.max(0, s - 1))
  }

  const saveBusiness = async () => {
    setBusy(true)
    setError('')
    try {
      await api('/api/organization', {
        method: 'PUT',
        body: {
          name: org.name,
          email: org.email,
          phone: org.phone,
          website: org.website,
          address: org.address,
          taxNumber: org.taxNumber,
          ...(canBrand && { logoUploadId: org.logoUploadId }),
        },
      })
      next()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const saveInvoice = async () => {
    setBusy(true)
    setError('')
    try {
      await api('/api/organization', {
        method: 'PUT',
        body: {
          defaultCurrency: org.defaultCurrency,
          defaultTaxRate: Number(org.defaultTaxRate),
          invoicePrefix: org.invoicePrefix,
          invoiceNextNumber: Number(org.invoiceNextNumber),
          paymentTermsDays: Number(org.paymentTermsDays),
          defaultNotes: org.defaultNotes,
        },
      })
      next()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const sendInvites = async () => {
    const rows = invites.filter((r) => r.email.trim())
    if (rows.length === 0) return next()
    setBusy(true)
    setError('')
    const failures: string[] = []
    for (const row of rows) {
      if (sent.includes(row.email)) continue
      try {
        await api('/api/team/invitations', { body: row })
        setSent((s) => [...s, row.email])
      } catch (e) {
        failures.push(`${row.email}: ${errorMessage(e)}`)
      }
    }
    setBusy(false)
    if (failures.length) setError(failures.join(' '))
    else next()
  }

  const finish = async () => {
    setBusy(true)
    try {
      await api('/api/organization/onboarding', { method: 'POST' })
      router.push('/dashboard')
      router.refresh()
    } catch (e) {
      setError(errorMessage(e))
      setBusy(false)
    }
  }

  const sample = `${org.invoicePrefix || 'INV'}-${new Date().getFullYear()}-${String(org.invoiceNextNumber || 1).padStart(4, '0')}`

  return (
    <div className="min-h-screen bg-surface-50">
      <div aria-hidden className="fixed inset-x-0 top-0 h-80 bg-gradient-to-b from-brand-50 to-transparent pointer-events-none" />
      <div className="relative mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <div className="flex items-center justify-between gap-2 mb-8">
          <Logo />
          <ThemeToggle className="ml-auto" />
          {step > 0 && step < STEPS.length - 1 && (
            <button onClick={() => setStep(STEPS.length - 1)} className="btn-ghost text-sm">
              Skip setup for now
            </button>
          )}
        </div>

        {/* Progress */}
        <ol className="flex items-center gap-2 mb-8" aria-label="Setup progress">
          {STEPS.map((s, i) => (
            <li key={s.id} className="flex-1 flex items-center gap-2">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors',
                  i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-brand-600 text-white ring-4 ring-brand-100' : 'bg-card text-slate-400 ring-1 ring-slate-200'
                )}
                aria-current={i === step ? 'step' : undefined}
              >
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span className={cn('hidden sm:block text-xs font-medium', i === step ? 'text-slate-900' : 'text-slate-400')}>{s.label}</span>
              {i < STEPS.length - 1 && <div className={cn('flex-1 h-px', i < step ? 'bg-emerald-300' : 'bg-slate-200')} />}
            </li>
          ))}
        </ol>

        <div className="card p-6 sm:p-8 animate-fade-up" key={step}>
          {error && <Alert className="mb-5">{error}</Alert>}

          {step === 0 && (
            <div className="text-center py-4">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-brand-600/30">
                <Receipt className="w-8 h-8 text-white" />
              </div>
              <h1 className="mt-6 font-display text-3xl font-bold text-slate-900 tracking-tight">Welcome to InvoiceFlow, {userName.split(' ')[0]}</h1>
              <p className="mt-3 text-slate-600 max-w-lg mx-auto">
                In a couple of minutes your workspace will be ready to send professional, VAT-ready quotations and invoices, track payments, and collaborate with your team.
              </p>
              {trialDays !== null && (
                <p className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 text-brand-700 text-sm font-medium ring-1 ring-brand-100">
                  <Sparkles className="w-4 h-4" /> Your {trialDays}-day {planName} trial has started — no card needed
                </p>
              )}
              <div className="mt-8 grid sm:grid-cols-3 gap-3 text-left">
                {[
                  { t: 'Business details', d: 'Name, logo and TRN for your documents' },
                  { t: 'Invoice preferences', d: 'Currency, VAT and numbering' },
                  { t: 'Invite your team', d: 'Sales, accountants and admins' },
                ].map((x, i) => (
                  <div key={x.t} className="rounded-xl bg-slate-50 ring-1 ring-slate-200/70 p-4">
                    <p className="text-xs font-semibold text-brand-600">Step {i + 1}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{x.t}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{x.d}</p>
                  </div>
                ))}
              </div>
              <button onClick={next} className="btn-primary btn-lg mt-8">
                Let&apos;s get started <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-xl font-bold text-slate-900">Your business</h2>
                <p className="text-sm text-slate-500 mt-1">This appears in the “From” section of every invoice and quotation.</p>
              </div>
              <LogoUploader logoUrl={org.logoUrl} locked={!canBrand} onChange={({ uploadId, url }) => setOrg((o) => ({ ...o, logoUploadId: uploadId, logoUrl: url }))} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="ob-name">Business name *</label>
                  <input id="ob-name" {...text('name')} className="input" required minLength={2} />
                </div>
                <div>
                  <label className="label" htmlFor="ob-trn">VAT / TRN number</label>
                  <input id="ob-trn" {...text('taxNumber')} className="input" placeholder="100234567800003" />
                </div>
                <div>
                  <label className="label" htmlFor="ob-phone">Phone</label>
                  <input id="ob-phone" {...text('phone')} className="input" placeholder="+971 4 000 0000" />
                </div>
                <div>
                  <label className="label" htmlFor="ob-email">Billing email</label>
                  <input id="ob-email" type="email" {...text('email')} className="input" placeholder="accounts@company.com" />
                </div>
                <div>
                  <label className="label" htmlFor="ob-web">Website</label>
                  <input id="ob-web" {...text('website')} className="input" placeholder="https://company.com" />
                </div>
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="ob-address">Address</label>
                  <textarea id="ob-address" {...text('address')} rows={2} className="input resize-none" placeholder="Office 1203, Business Bay, Dubai, UAE" />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-xl font-bold text-slate-900">Invoice preferences</h2>
                <p className="text-sm text-slate-500 mt-1">Defaults for new documents — you can override them on each invoice.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="label" htmlFor="ob-cur">Default currency</label>
                  <select id="ob-cur" value={org.defaultCurrency} onChange={(e) => set('defaultCurrency', e.target.value)} className="input">
                    {Object.values(CURRENCIES).map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="ob-vat">VAT rate (%)</label>
                  <input id="ob-vat" type="number" min={0} max={100} step="0.01" value={org.defaultTaxRate} onChange={(e) => set('defaultTaxRate', Number(e.target.value))} className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="ob-terms">Payment terms (days)</label>
                  <input id="ob-terms" type="number" min={0} max={365} value={org.paymentTermsDays} onChange={(e) => set('paymentTermsDays', Number(e.target.value))} className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="ob-prefix">Invoice prefix</label>
                  <input id="ob-prefix" value={org.invoicePrefix} onChange={(e) => set('invoicePrefix', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))} className="input font-mono" />
                </div>
                <div>
                  <label className="label" htmlFor="ob-next">Next invoice number</label>
                  <input id="ob-next" type="number" min={1} value={org.invoiceNextNumber} onChange={(e) => set('invoiceNextNumber', Number(e.target.value))} className="input" />
                </div>
                <div className="flex flex-col justify-end">
                  <p className="text-xs text-slate-500 mb-1.5">Your next invoice</p>
                  <p className="h-10 flex items-center px-3.5 rounded-xl bg-slate-50 ring-1 ring-slate-200 font-mono text-sm font-semibold text-slate-900">{sample}</p>
                </div>
                <div className="sm:col-span-3">
                  <label className="label" htmlFor="ob-notes">Default notes / terms</label>
                  <textarea id="ob-notes" {...text('defaultNotes')} rows={2} className="input resize-none" placeholder="Payment due within 30 days. Thank you for your business!" />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-xl font-bold text-slate-900">Invite your team</h2>
                <p className="text-sm text-slate-500 mt-1">Teammates get an email invitation. You can always invite people later from Team.</p>
              </div>
              <div className="space-y-2.5">
                {invites.map((row, i) => (
                  <div key={i} className="flex gap-2">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        type="email"
                        value={row.email}
                        onChange={(e) => setInvites((list) => list.map((r, idx) => (idx === i ? { ...r, email: e.target.value } : r)))}
                        className="input pl-10"
                        placeholder="teammate@company.com"
                        aria-label={`Invite email ${i + 1}`}
                        disabled={sent.includes(row.email) && !!row.email}
                      />
                    </div>
                    <select
                      value={row.role}
                      onChange={(e) => setInvites((list) => list.map((r, idx) => (idx === i ? { ...r, role: e.target.value as InviteRow['role'] } : r)))}
                      className="input w-40"
                      aria-label={`Role ${i + 1}`}
                    >
                      {(['ADMIN', 'ACCOUNTANT', 'SALES', 'VIEWER'] as const).map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r].label}
                        </option>
                      ))}
                    </select>
                    {sent.includes(row.email) && row.email ? (
                      <span className="w-10 flex items-center justify-center text-emerald-600" title="Invitation sent">
                        <Check className="w-4 h-4" />
                      </span>
                    ) : (
                      invites.length > 1 && (
                        <button type="button" onClick={() => setInvites((l) => l.filter((_, idx) => idx !== i))} className="icon-btn w-10 h-10" aria-label="Remove">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )
                    )}
                  </div>
                ))}
                {invites.length < 10 && (
                  <button type="button" onClick={() => setInvites((l) => [...l, { email: '', role: 'SALES' }])} className="btn-ghost text-sm">
                    <Plus className="w-4 h-4" /> Add another
                  </button>
                )}
              </div>
              <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200/70 p-4 grid sm:grid-cols-2 gap-3">
                {(['ADMIN', 'ACCOUNTANT', 'SALES', 'VIEWER'] as const).map((r) => (
                  <div key={r}>
                    <p className="text-xs font-semibold text-slate-900">{ROLE_LABELS[r].label}</p>
                    <p className="text-xs text-slate-500">{ROLE_LABELS[r].description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="text-center py-6">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <PartyPopper className="w-8 h-8 text-white" />
              </div>
              <h2 className="mt-6 font-display text-3xl font-bold text-slate-900 tracking-tight">Your InvoiceFlow workspace is ready.</h2>
              <p className="mt-3 text-slate-600 max-w-md mx-auto">
                Add your first customer, send a quotation, and turn it into an invoice in one click. You can refine everything later in Company settings.
              </p>
              <button onClick={finish} disabled={busy} className="btn-primary btn-lg mt-8">
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                Go to my dashboard <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step > 0 && step < 4 && (
            <div className="flex items-center justify-between mt-8 pt-5 border-t border-slate-100">
              <button onClick={back} className="btn-ghost">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <div className="flex gap-2">
                <button onClick={next} className="btn-secondary">
                  Skip
                </button>
                <button onClick={step === 1 ? saveBusiness : step === 2 ? saveInvoice : sendInvites} disabled={busy || (step === 1 && org.name.trim().length < 2)} className="btn-primary">
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                  {step === 3 ? (invites.some((r) => r.email.trim()) ? 'Send invites' : 'Continue') : 'Save & continue'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
