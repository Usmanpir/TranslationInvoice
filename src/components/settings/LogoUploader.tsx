'use client'
import { useRef, useState } from 'react'
import { ImagePlus, Loader2, Lock, Trash2 } from 'lucide-react'
import { api } from '@/lib/api-client'
import { useFeedback } from '@/components/providers/FeedbackProvider'

interface LogoUploaderProps {
  logoUrl: string | null
  locked?: boolean
  onChange: (next: { uploadId: string | null; url: string | null }) => void
}

/** Uploads a workspace logo (PNG/JPG/WebP, ≤5 MB). Saving the id is left to the parent form. */
export function LogoUploader({ logoUrl, locked, onChange }: LogoUploaderProps) {
  const { handleError, showUpgrade } = useFeedback()
  const [busy, setBusy] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const pick = () => {
    if (locked) {
      return showUpgrade('Adding your logo to invoices is part of custom branding.', {
        feature: 'customBranding',
        featureLabel: 'Custom branding',
        suggestedPlanName: 'Starter',
      })
    }
    input.current?.click()
  }

  const upload = async (file: File) => {
    setBusy(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('purpose', 'LOGO')
      const res = await api<{ id: string; url: string }>('/api/upload', { body: form })
      onChange({ uploadId: res.id, url: res.url })
    } catch (e) {
      handleError(e, 'Logo upload failed.')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={pick}
        className="relative w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden hover:border-brand-300 hover:bg-brand-50/40 transition-colors"
        aria-label={logoUrl ? 'Replace logo' : 'Upload logo'}
      >
        {busy ? (
          <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
        ) : logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Logo" className="w-full h-full object-contain bg-card p-1.5" />
        ) : locked ? (
          <Lock className="w-5 h-5 text-slate-400" />
        ) : (
          <ImagePlus className="w-6 h-6 text-slate-400" />
        )}
      </button>
      <div className="space-y-1.5">
        <div className="flex gap-2">
          <button type="button" onClick={pick} disabled={busy} className="btn-secondary btn-sm">
            {logoUrl ? 'Replace' : 'Upload logo'}
          </button>
          {logoUrl && !locked && (
            <button type="button" onClick={() => onChange({ uploadId: null, url: null })} className="btn-ghost btn-sm text-red-600 hover:bg-red-50">
              <Trash2 className="w-3.5 h-3.5" /> Remove
            </button>
          )}
        </div>
        <p className="text-xs text-slate-400">{locked ? 'Available on Starter and above.' : 'PNG or JPG, up to 5 MB. Shown on invoices and PDFs.'}</p>
      </div>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
    </div>
  )
}
