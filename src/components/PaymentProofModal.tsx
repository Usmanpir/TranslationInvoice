'use client'
import { useState, useRef, useCallback } from 'react'
import { Upload, FileImage, Loader2, CheckCircle, BadgeCheck, Lock } from 'lucide-react'
import { format } from 'date-fns'
import { Modal } from '@/components/ui/Modal'
import { Alert } from '@/components/ui/States'
import { DatePicker } from '@/components/ui/DatePicker'
import { api, ApiRequestError } from '@/lib/api-client'
import { useWorkspace } from '@/components/providers/WorkspaceProvider'
import { useFeedback } from '@/components/providers/FeedbackProvider'

interface PaymentProofModalProps {
  invoiceId: string
  invoiceNumber: string
  amountLabel: string
  onRecorded: () => void
  onClose: () => void
}

const METHODS = [
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'CARD', label: 'Card' },
  { value: 'PAYPAL', label: 'PayPal' },
  { value: 'OTHER', label: 'Other' },
]

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']

/** Records a full payment against an invoice, optionally with an uploaded proof. */
export function PaymentProofModal({ invoiceId, invoiceNumber, amountLabel, onRecorded, onClose }: PaymentProofModalProps) {
  const { hasFeature } = useWorkspace()
  const { handleError, showUpgrade } = useFeedback()
  const canAttach = hasFeature('paymentProofs')

  const [method, setMethod] = useState('BANK_TRANSFER')
  const [reference, setReference] = useState('')
  const [paidAt, setPaidAt] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((f: File) => {
    setError('')
    if (!ALLOWED.includes(f.type)) return setError('Invalid file type. Allowed: JPEG, PNG, WebP, GIF, PDF')
    if (f.size > 5 * 1024 * 1024) return setError('File too large. Maximum size is 5MB.')
    setFile(f)
    if (f.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => setPreview(e.target?.result as string)
      reader.readAsDataURL(f)
    } else {
      setPreview(null)
    }
  }, [])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    else if (e.type === 'dragleave') setDragActive(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)
      if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0])
    },
    [handleFile]
  )

  const openPicker = () => {
    if (!canAttach) {
      return showUpgrade('Attaching payment proofs is available on the Starter plan and above.', {
        feature: 'paymentProofs',
        featureLabel: 'Payment proof uploads',
        suggestedPlanName: 'Starter',
      })
    }
    inputRef.current?.click()
  }

  const handleSubmit = async () => {
    setSaving(true)
    setError('')
    try {
      let proofUrl: string | null = null
      if (file) {
        const form = new FormData()
        form.append('file', file)
        form.append('purpose', 'PAYMENT_PROOF')
        const upload = await api<{ url: string }>('/api/upload', { body: form })
        proofUrl = upload.url
      }
      await api(`/api/invoices/${invoiceId}/payments`, {
        body: { method, reference: reference || undefined, paidAt, proofUrl },
      })
      onRecorded()
    } catch (e) {
      if (e instanceof ApiRequestError && !e.isUpgradeRequired) setError(e.message)
      else handleError(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Record payment" description={`Mark ${invoiceNumber} as paid (${amountLabel})`} icon={BadgeCheck} onClose={onClose}>
      <div className="px-6 pb-6 space-y-4">
        {error && <Alert>{error}</Alert>}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="method">Method</label>
            <select id="method" value={method} onChange={(e) => setMethod(e.target.value)} className="input">
              {METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Paid on</label>
            <DatePicker value={paidAt} onChange={setPaidAt} max={format(new Date(), 'yyyy-MM-dd')} ariaLabel="Paid on" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="reference">
            Reference <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input id="reference" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={200} className="input" placeholder="Transfer ID, cheque number…" />
        </div>

        <div>
          <p className="label flex items-center gap-1.5">
            Payment proof <span className="font-normal text-slate-400">(optional)</span>
            {!canAttach && <Lock className="w-3 h-3 text-slate-400" />}
          </p>
          <div
            onDragEnter={canAttach ? handleDrag : undefined}
            onDragLeave={canAttach ? handleDrag : undefined}
            onDragOver={canAttach ? handleDrag : undefined}
            onDrop={canAttach ? handleDrop : undefined}
            onClick={openPicker}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openPicker()}
            className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
              dragActive
                ? 'border-brand-500 bg-brand-50 scale-[1.01]'
                : file
                  ? 'border-emerald-300 bg-emerald-50/50'
                  : 'border-slate-200 bg-slate-50/40 hover:border-brand-300 hover:bg-brand-50/30'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ALLOWED.join(',')}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="hidden"
            />
            {file ? (
              <div className="space-y-3 animate-fade-in">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="Preview" className="max-h-32 mx-auto rounded-xl object-contain shadow-card" />
                ) : (
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-100 flex items-center justify-center">
                    <FileImage className="w-6 h-6 text-emerald-600" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-slate-900 truncate max-w-[300px] mx-auto">{file.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setFile(null)
                    setPreview(null)
                  }}
                  className="text-xs font-medium text-slate-500 hover:text-red-500 underline underline-offset-2"
                >
                  Remove and choose another
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-11 h-11 bg-white rounded-2xl border border-slate-200 shadow-card flex items-center justify-center mx-auto">
                  {canAttach ? <Upload className="w-5 h-5 text-brand-600" /> : <Lock className="w-5 h-5 text-slate-400" />}
                </div>
                <p className="text-sm font-medium text-slate-700">
                  {canAttach ? (
                    <>
                      Drop a receipt here, or <span className="text-brand-600 font-semibold">browse</span>
                    </>
                  ) : (
                    'Upgrade to attach receipts'
                  )}
                </p>
                <p className="text-xs text-slate-400">JPEG, PNG, WebP, GIF or PDF up to 5MB</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary flex-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Mark as paid'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
