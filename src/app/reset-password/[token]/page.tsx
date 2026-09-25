'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { CheckCircle2, Eye, EyeOff, Loader2, Lock } from 'lucide-react'
import { AuthShell } from '@/components/auth/AuthShell'
import { Alert } from '@/components/ui/States'
import { api, errorMessage } from '@/lib/api-client'

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) return setError('The passwords do not match.')
    setBusy(true)
    try {
      await api('/api/auth/password-reset', { method: 'PUT', body: { token, password } })
      setDone(true)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Choose a new password" subtitle="Use at least 8 characters with a letter and a number">
      {done ? (
        <div className="space-y-6">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 ring-1 ring-emerald-200 text-sm text-emerald-800">
            <CheckCircle2 className="w-5 h-5" /> Password updated. You’ve been signed out of other devices.
          </div>
          <Link href="/login" className="btn-primary w-full h-11">
            Sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <Alert>{error}</Alert>}
          {(['password', 'confirm'] as const).map((field) => (
            <div key={field}>
              <label className="label" htmlFor={field}>{field === 'password' ? 'New password' : 'Confirm new password'}</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  id={field}
                  type={show ? 'text' : 'password'}
                  value={field === 'password' ? password : confirm}
                  onChange={(e) => (field === 'password' ? setPassword : setConfirm)(e.target.value)}
                  className="input h-11 pl-10 pr-11"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                {field === 'password' && (
                  <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-1.5 top-1/2 -translate-y-1/2 icon-btn">
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          ))}
          <button type="submit" disabled={busy} className="btn-primary w-full h-11">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Update password
          </button>
        </form>
      )}
    </AuthShell>
  )
}
