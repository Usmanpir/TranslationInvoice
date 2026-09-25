'use client'
import { useState, useRef, useCallback } from 'react'
import { Upload, FileImage, Loader2, CheckCircle, BadgeCheck } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Alert } from '@/components/ui/States'

interface PaymentProofModalProps {
  invoiceNumber: string
  onConfirm: (fileUrl: string) => void
  onClose: () => void
}

export function PaymentProofModal({ invoiceNumber, onConfirm, onClose }: PaymentProofModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((f: File) => {
    setError('')

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
    if (!allowed.includes(f.type)) {
      setError('Invalid file type. Allowed: JPEG, PNG, WebP, GIF, PDF')
      return
    }

    if (f.size > 5 * 1024 * 1024) {
      setError('File too large. Maximum size is 5MB.')
      return
    }

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
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)
      if (e.dataTransfer.files?.[0]) {
        handleFile(e.dataTransfer.files[0])
      }
    },
    [handleFile]
  )

  const handleSubmit = async () => {
    if (!file) return
    setUploading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
      const uploadData = await uploadRes.json()

      if (!uploadRes.ok) {
        setError(uploadData.error || 'Upload failed')
        return
      }

      onConfirm(uploadData.url)
    } catch {
      setError('Something went wrong')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Modal
      title="Payment Proof"
      description={`Upload proof of payment for ${invoiceNumber}`}
      icon={BadgeCheck}
      onClose={onClose}
    >
      <div className="px-6 pb-6 space-y-4">
        {error && <Alert>{error}</Alert>}

        {/* Drop zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
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
            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="hidden"
          />

          {file ? (
            <div className="space-y-3 animate-fade-in">
              {preview ? (
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-40 mx-auto rounded-xl object-contain shadow-card"
                />
              ) : (
                <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 flex items-center justify-center">
                  <FileImage className="w-7 h-7 text-emerald-600" />
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-slate-900 truncate max-w-[300px] mx-auto">
                  {file.name}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
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
            <div className="space-y-3">
              <div className="w-14 h-14 bg-white rounded-2xl border border-slate-200 shadow-card flex items-center justify-center mx-auto">
                <Upload className="w-6 h-6 text-brand-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">
                  Drop your file here, or{' '}
                  <span className="text-brand-600 font-semibold">browse</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  JPEG, PNG, WebP, GIF or PDF up to 5MB
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!file || uploading}
            className="btn-primary flex-1"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            {uploading ? 'Uploading...' : 'Save & Mark Paid'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
