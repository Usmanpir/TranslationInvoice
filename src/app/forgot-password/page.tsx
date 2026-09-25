'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Mail, MailCheck } from 'lucide-react'
import { AuthShell } from '@/components/auth/AuthShell'
import { Alert } from '@/components/ui/States'
import { api, errorMessage } from '@/lib/api-client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api('/api/auth/password-reset', { body: { email } })
      setSent(true)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Reset your password" subtitle="We’ll email you a link to choose a new one">
      {sent ? (
        <div className="space-y-6">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 ring-1 ring-emerald-200 text-sm text-emerald-800">
            <MailCheck className="w-5 h-5 flex-shrink-0" />
            If an account exists for {email}, a reset link is on its way. It expires in 1 hour.
          </div>
          <Link href="/login" className="btn-secondary w-full h-11">
            <ArrowLeft className="w-4 h-4" /> Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <Alert>{error}</Alert>}
          <div>
            <label className="label" htmlFor="email">Email address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input h-11 pl-10" required autoComplete="email" autoFocus />
            </div>
          </div>
          <button type="submit" disabled={busy} className="btn-primary w-full h-11">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Send reset link
          </button>
          <p className="text-center text-sm text-slate-500 pt-2">
            Remembered it?{' '}
            <Link href="/login" className="text-brand-600 font-semibold hover:text-brand-700">
              Sign in
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  )
}
