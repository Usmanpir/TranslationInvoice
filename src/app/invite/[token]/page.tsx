'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { signIn, signOut } from 'next-auth/react'
import { AlertTriangle, ArrowRight, Building2, Loader2, Lock, User, UsersRound } from 'lucide-react'
import { AuthShell } from '@/components/auth/AuthShell'
import { Alert, PageLoader } from '@/components/ui/States'
import { api, errorMessage } from '@/lib/api-client'

interface InvitePreview {
  email: string
  roleLabel: string
  organizationName: string
  invitedBy: string | null
  expired: boolean
  accepted: boolean
  hasAccount: boolean
  signedInAs: string | null
}

export default function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [invite, setInvite] = useState<InvitePreview | null>(null)
  const [loadError, setLoadError] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api<InvitePreview>(`/api/invitations/${token}`)
      .then(setInvite)
      .catch((e) => setLoadError(errorMessage(e, 'This invitation link is not valid.')))
  }, [token])

  const accept = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await api<{ createdAccount: boolean; email: string }>(`/api/invitations/${token}`, {
        body: invite?.signedInAs ? {} : { name, password },
      })
      if (res.createdAccount) {
        const login = await signIn('credentials', { email: res.email, password, redirect: false })
        if (login?.error) return router.push('/login')
      }
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  if (loadError || (invite && (invite.expired || invite.accepted))) {
    const title = invite?.accepted ? 'Invitation already used' : invite?.expired ? 'Invitation expired' : 'Invitation not found'
    const body = invite?.accepted
      ? 'This invitation has already been accepted. Sign in to access the workspace.'
      : invite?.expired
        ? `Ask ${invite.invitedBy ?? 'the workspace admin'} to send you a new invitation.`
        : loadError
    return (
      <AuthShell title={title} subtitle={body}>
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 ring-1 ring-amber-200 text-amber-800 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" /> {body}
        </div>
        <Link href="/login" className="btn-primary w-full h-11 mt-6">
          Go to sign in
        </Link>
      </AuthShell>
    )
  }

  if (!invite) return <PageLoader label="Checking your invitation…" />

  const wrongAccount = invite.signedInAs && invite.signedInAs.toLowerCase() !== invite.email.toLowerCase()

  return (
    <AuthShell title={`Join ${invite.organizationName}`} subtitle={`${invite.invitedBy ?? 'A teammate'} invited you as ${invite.roleLabel}.`}>
      <div className="flex items-center gap-3 p-4 mb-6 rounded-xl bg-brand-50/70 ring-1 ring-brand-100">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-indigo-600 flex items-center justify-center text-white">
          <UsersRound className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{invite.organizationName}</p>
          <p className="text-xs text-slate-500 truncate">
            {invite.email} · {invite.roleLabel}
          </p>
        </div>
      </div>

      {error && <Alert className="mb-4">{error}</Alert>}

      {wrongAccount ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            You&apos;re signed in as <span className="font-semibold">{invite.signedInAs}</span>, but this invitation is for{' '}
            <span className="font-semibold">{invite.email}</span>.
          </p>
          <button onClick={() => signOut({ callbackUrl: `/login?callbackUrl=/invite/${token}` })} className="btn-primary w-full h-11">
            Switch account
          </button>
        </div>
      ) : invite.signedInAs ? (
        <button onClick={() => accept()} disabled={busy} className="btn-primary w-full h-11">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
          Accept & join workspace
        </button>
      ) : invite.hasAccount ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">You already have an InvoiceFlow account. Sign in to accept the invitation.</p>
          <Link href={`/login?callbackUrl=/invite/${token}`} className="btn-primary w-full h-11">
            Sign in to accept <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <form onSubmit={accept} className="space-y-4">
          <p className="text-sm text-slate-600">Create your account to join.</p>
          <div>
            <label className="label" htmlFor="inv-name">Full name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input id="inv-name" value={name} onChange={(e) => setName(e.target.value)} className="input h-11 pl-10" required minLength={2} autoComplete="name" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="inv-pass">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input id="inv-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input h-11 pl-10" required minLength={8} autoComplete="new-password" />
            </div>
            <p className="hint">At least 8 characters with a letter and a number.</p>
          </div>
          <button type="submit" disabled={busy} className="btn-primary w-full h-11">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Create account & join
          </button>
        </form>
      )}
    </AuthShell>
  )
}
