'use client'
import { useEffect, useMemo, useState } from 'react'
import { Building2, FileText, Landmark, Loader2, Lock, Palette, Percent, RotateCcw, Save } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Alert, PageLoader } from '@/components/ui/States'
import { FormSection } from '@/components/forms/FormSection'
import { LogoUploader } from '@/components/settings/LogoUploader'
import { DocumentPreview } from '@/components/documents/DocumentPreview'
import { useWorkspace } from '@/components/providers/WorkspaceProvider'
import { useFeedback } from '@/components/providers/FeedbackProvider'
import { api, ApiRequestError } from '@/lib/api-client'
import { calculateInvoiceTotals, cn, CURRENCIES } from '@/lib/utils'
import { COUNTRIES } from '@/lib/countries'

type Settings = Record<string, any>

const TABS = [
  { id: 'company', label: 'Company', icon: Building2 },
  { id: 'tax', label: 'Tax', icon: Percent },
  { id: 'banking', label: 'Banking', icon: Landmark },
  { id: 'invoice', label: 'Invoices', icon: FileText },
  { id: 'branding', label: 'Branding', icon: Palette },
] as const
type Tab = (typeof TABS)[number]['id']

const EDITABLE = [
  'name', 'email', 'phone', 'website', 'address', 'country',
  'taxNumber', 'taxLabel', 'defaultTaxRate', 'taxInclusive',
  'bankName', 'bankBranch', 'bankAccountName', 'bankAccountNumber', 'iban', 'swiftCode', 'paypalEmail', 'paymentInstructions',
  'defaultCurrency', 'invoicePrefix', 'quotationPrefix', 'invoiceNextNumber', 'quotationNextNumber', 'numberPadding', 'paymentTermsDays', 'defaultNotes', 'invoiceFooter',
  'timezone', 'dateFormat', 'primaryColor', 'logoUploadId',
] as const

const pick = (s: Settings) => Object.fromEntries(EDITABLE.map((k) => [k, s[k] ?? null]))

export default function SettingsPage() {
  const { can } = useWorkspace()
  const { handleError, toast } = useFeedback()
  const [original, setOriginal] = useState<Settings | null>(null)
  const [form, setForm] = useState<Settings | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [canBrand, setCanBrand] = useState(false)
  const [tab, setTab] = useState<Tab>('company')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const readOnly = !can('settings.manage')

  useEffect(() => {
    api<Settings>('/api/organization')
      .then((s) => {
        setOriginal(pick(s))
        setForm(pick(s))
        setLogoUrl(s.logoUrl)
        setCanBrand(Boolean(s.canCustomizeBranding))
      })
      .catch((e) => handleError(e, 'Could not load settings.'))
  }, [handleError])

  const dirtyKeys = useMemo(
    () => (form && original ? EDITABLE.filter((k) => JSON.stringify(form[k]) !== JSON.stringify(original[k])) : []),
    [form, original]
  )

  if (!form || !original) return <PageLoader label="Loading settings…" />

  const set = (key: string, value: unknown) => setForm((f) => ({ ...f!, [key]: value }))
  const text = (key: string) => ({
    value: form[key] ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => set(key, e.target.value),
    disabled: readOnly,
  })
  const num = (key: string) => ({
    value: form[key] ?? 0,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(key, e.target.value === '' ? '' : Number(e.target.value)),
    disabled: readOnly,
    type: 'number' as const,
  })

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const body = Object.fromEntries(dirtyKeys.map((k) => [k, form[k] === '' ? null : form[k]]))
      const saved = await api<Settings>('/api/organization', { method: 'PUT', body })
      setOriginal(pick(saved))
      setForm(pick(saved))
      setLogoUrl(saved.logoUrl)
      toast.success('Settings saved.')
    } catch (e) {
      if (e instanceof ApiRequestError && e.code === 'VALIDATION_ERROR') setError(e.message)
      else handleError(e)
    } finally {
      setSaving(false)
    }
  }

  const sampleItems = [
    { description: 'Consulting services', quantity: 10, unitPrice: 350, total: 3500 },
    { description: 'Project management', quantity: 1, unitPrice: 800, total: 800 },
  ]
  const totals = calculateInvoiceTotals(sampleItems, Number(form.defaultTaxRate) || 0, 0, Boolean(form.taxInclusive))
  const sampleNumber = `${form.invoicePrefix || 'INV'}-${new Date().getFullYear()}-${String(form.invoiceNextNumber || 1).padStart(Number(form.numberPadding) || 4, '0')}`

  return (
    <div>
      <PageHeader title="Company settings" description="Details, tax, banking and branding used on every document" />

      <div className="p-4 sm:p-6 lg:p-10 pb-32">
        {readOnly && (
          <Alert className="mb-5 max-w-5xl">
            You can view these settings, but only workspace admins can change them.
          </Alert>
        )}

        <div className="flex gap-1 p-1 mb-6 rounded-xl bg-slate-100/80 ring-1 ring-inset ring-slate-200/70 overflow-x-auto w-fit max-w-full" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'inline-flex items-center gap-2 px-3.5 h-9 text-sm font-medium rounded-lg transition-all whitespace-nowrap',
                tab === t.id ? 'bg-card text-slate-900 shadow-[0_1px_3px_0_rgb(15_23_42/0.12)] ring-1 ring-slate-200/70' : 'text-slate-500 hover:text-slate-900'
              )}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="max-w-5xl space-y-5 animate-fade-in" key={tab}>
          {error && <Alert>{error}</Alert>}

          {tab === 'company' && (
            <FormSection icon={Building2} title="Company" description="Shown in the “From” block of invoices and quotations">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="s-name">Business name *</label>
                  <input id="s-name" {...text('name')} className="input" required minLength={2} maxLength={160} />
                </div>
                <div>
                  <label className="label" htmlFor="s-email">Email</label>
                  <input id="s-email" type="email" {...text('email')} className="input" placeholder="accounts@company.com" />
                </div>
                <div>
                  <label className="label" htmlFor="s-phone">Phone</label>
                  <input id="s-phone" {...text('phone')} className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="s-web">Website</label>
                  <input id="s-web" {...text('website')} className="input" placeholder="https://company.com" />
                </div>
                <div>
                  <label className="label" htmlFor="s-country">Country</label>
                  <select id="s-country" {...text('country')} className="input">
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="s-address">Address</label>
                  <textarea id="s-address" {...text('address')} rows={3} className="input resize-none" />
                </div>
              </div>
            </FormSection>
          )}

          {tab === 'tax' && (
            <FormSection icon={Percent} title="Tax" description="VAT / TRN and default tax behaviour for new documents">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="label" htmlFor="s-trn">Tax registration number (TRN)</label>
                  <input id="s-trn" {...text('taxNumber')} className="input font-mono" placeholder="100234567800003" />
                </div>
                <div>
                  <label className="label" htmlFor="s-taxlabel">Tax name</label>
                  <input id="s-taxlabel" {...text('taxLabel')} className="input" placeholder="VAT" maxLength={20} />
                  <p className="hint">e.g. VAT, GST, Sales Tax</p>
                </div>
                <div>
                  <label className="label" htmlFor="s-rate">Default rate (%)</label>
                  <input id="s-rate" {...num('defaultTaxRate')} min={0} max={100} step="0.01" className="input" />
                  <p className="hint">UAE standard VAT is 5%.</p>
                </div>
                <label className="sm:col-span-3 flex items-start gap-3 p-4 rounded-xl ring-1 ring-slate-200 cursor-pointer hover:bg-slate-50">
                  <input type="checkbox" checked={Boolean(form.taxInclusive)} onChange={(e) => set('taxInclusive', e.target.checked)} disabled={readOnly} className="mt-0.5 w-4 h-4 accent-brand-600" />
                  <span>
                    <span className="block text-sm font-medium text-slate-900">Prices include tax by default</span>
                    <span className="block text-xs text-slate-500">When on, line prices are treated as tax-inclusive and the tax portion is shown separately.</span>
                  </span>
                </label>
              </div>
            </FormSection>
          )}

          {tab === 'banking' && (
            <FormSection icon={Landmark} title="Banking & payment instructions" description="Printed in the Terms section so customers know how to pay">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="s-bank">Bank name</label>
                  <input id="s-bank" {...text('bankName')} className="input" placeholder="Emirates NBD" />
                </div>
                <div>
                  <label className="label" htmlFor="s-branch">Branch</label>
                  <input id="s-branch" {...text('bankBranch')} className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="s-accname">Account name</label>
                  <input id="s-accname" {...text('bankAccountName')} className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="s-accno">Account number</label>
                  <input id="s-accno" {...text('bankAccountNumber')} className="input font-mono" />
                </div>
                <div>
                  <label className="label" htmlFor="s-iban">IBAN</label>
                  <input id="s-iban" {...text('iban')} className="input font-mono" placeholder="AE07 0331 2345 6789 0123 456" />
                </div>
                <div>
                  <label className="label" htmlFor="s-swift">SWIFT / BIC</label>
                  <input id="s-swift" {...text('swiftCode')} className="input font-mono" />
                </div>
                <div>
                  <label className="label" htmlFor="s-paypal">PayPal email</label>
                  <input id="s-paypal" type="email" {...text('paypalEmail')} className="input" />
                </div>
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="s-instr">Payment instructions</label>
                  <textarea id="s-instr" {...text('paymentInstructions')} rows={3} className="input resize-none" placeholder="Please include the invoice number as the payment reference." />
                </div>
              </div>
            </FormSection>
          )}

          {tab === 'invoice' && (
            <FormSection icon={FileText} title="Invoice & quotation defaults" description="Numbering and defaults for new documents">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="label" htmlFor="s-cur">Default currency</label>
                  <select id="s-cur" {...text('defaultCurrency')} className="input">
                    {Object.values(CURRENCIES).map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <p className="hint">Existing documents keep the currency they were created with.</p>
                </div>
                <div>
                  <label className="label" htmlFor="s-terms">Payment terms (days)</label>
                  <input id="s-terms" {...num('paymentTermsDays')} min={0} max={365} className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="s-pad">Number digits</label>
                  <input id="s-pad" {...num('numberPadding')} min={1} max={8} className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="s-ipre">Invoice prefix</label>
                  <input id="s-ipre" {...text('invoicePrefix')} className="input font-mono uppercase" maxLength={10} />
                </div>
                <div>
                  <label className="label" htmlFor="s-inext">Next invoice number</label>
                  <input id="s-inext" {...num('invoiceNextNumber')} min={1} className="input" />
                </div>
                <div className="flex flex-col justify-end">
                  <p className="text-xs text-slate-500 mb-1.5">Preview</p>
                  <p className="h-10 flex items-center px-3.5 rounded-xl bg-slate-50 ring-1 ring-slate-200 font-mono text-sm font-semibold text-slate-900">{sampleNumber}</p>
                </div>
                <div>
                  <label className="label" htmlFor="s-qpre">Quotation prefix</label>
                  <input id="s-qpre" {...text('quotationPrefix')} className="input font-mono uppercase" maxLength={10} />
                </div>
                <div>
                  <label className="label" htmlFor="s-qnext">Next quotation number</label>
                  <input id="s-qnext" {...num('quotationNextNumber')} min={1} className="input" />
                </div>
                <div className="hidden sm:block" />
                <div className="sm:col-span-3">
                  <label className="label" htmlFor="s-notes">Default notes</label>
                  <textarea id="s-notes" {...text('defaultNotes')} rows={3} className="input resize-none" placeholder="Payment due within 30 days. Thank you for your business!" />
                </div>
              </div>
              <p className="hint mt-4">Numbers never repeat: if a number is already used, the next free one is chosen automatically.</p>
            </FormSection>
          )}

          {tab === 'branding' && (
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)] gap-5 items-start">
              <FormSection icon={Palette} title="Branding" description="Logo, colour and footer on your documents">
                {!canBrand && (
                  <div className="mb-4 flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 ring-1 ring-amber-200 text-xs text-amber-800">
                    <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" /> Logo and brand colour are available on Starter and above. Your footer is always editable.
                  </div>
                )}
                <div className="space-y-5">
                  <LogoUploader
                    logoUrl={logoUrl}
                    locked={!canBrand || readOnly}
                    onChange={({ uploadId, url }) => {
                      set('logoUploadId', uploadId)
                      setLogoUrl(url)
                    }}
                  />
                  <div>
                    <label className="label" htmlFor="s-color">Brand colour</label>
                    <div className="flex gap-2">
                      <input
                        id="s-color"
                        type="color"
                        value={form.primaryColor || '#0070c7'}
                        onChange={(e) => set('primaryColor', e.target.value)}
                        disabled={!canBrand || readOnly}
                        className="h-10 w-14 rounded-xl border border-slate-200 bg-card p-1 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <input {...text('primaryColor')} disabled={!canBrand || readOnly} className="input font-mono" maxLength={7} />
                    </div>
                  </div>
                  <div>
                    <label className="label" htmlFor="s-footer">Invoice footer</label>
                    <textarea id="s-footer" {...text('invoiceFooter')} rows={2} maxLength={500} className="input resize-none" placeholder="THANK YOU FOR YOUR TIME AND CONSIDERATION IN OUR SERVICE!" />
                  </div>
                </div>
              </FormSection>

              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-[0.08em] mb-2">Live preview</p>
                <div className="pointer-events-none select-none">
                  <DocumentPreview
                    compact
                    doc={{
                      kind: 'invoice',
                      number: sampleNumber,
                      status: 'PENDING',
                      issueDate: new Date(),
                      dueDate: new Date(Date.now() + (Number(form.paymentTermsDays) || 0) * 86400000),
                      currency: form.defaultCurrency,
                      taxRate: Number(form.defaultTaxRate) || 0,
                      taxInclusive: Boolean(form.taxInclusive),
                      discount: 0,
                      ...totals,
                      notes: form.defaultNotes,
                      items: sampleItems,
                      customer: { name: 'Sample Customer LLC', company: 'Sample Customer LLC', address: 'Dubai, UAE' },
                      issuer: {
                        ...form,
                        name: form.name,
                        logoUrl: canBrand ? logoUrl : null,
                        primaryColor: canBrand ? form.primaryColor : '#0070c7',
                      },
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save bar */}
      {!readOnly && dirtyKeys.length > 0 && (
        <div className="fixed bottom-4 inset-x-4 lg:left-[calc(16rem+1rem)] z-30 flex justify-center pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-3 pl-5 pr-2 py-2 rounded-2xl bg-ink-900 text-white shadow-elevated animate-scale-in">
            <p className="text-sm">
              {dirtyKeys.length} unsaved change{dirtyKeys.length === 1 ? '' : 's'}
            </p>
            <button onClick={() => setForm(original)} className="btn h-9 px-3 text-ink-200 hover:bg-white/10">
              <RotateCcw className="w-4 h-4" /> Discard
            </button>
            <button onClick={save} disabled={saving} className="btn-primary h-9">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save changes
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
