'use client'
import { useCallback, useEffect, useState } from 'react'
import { Copy, Loader2, Mail, MailPlus, ShieldCheck, Trash2, UserPlus, UsersRound, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { PageHeader } from '@/components/ui/PageHeader'
import { Alert, EmptyState, PageLoader } from '@/components/ui/States'
import { Modal } from '@/components/ui/Modal'
import { useDialog } from '@/components/ui/Dialog'
import { useWorkspace } from '@/components/providers/WorkspaceProvider'
import { useFeedback } from '@/components/providers/FeedbackProvider'
import { api, ApiRequestError } from '@/lib/api-client'
import { ROLE_LABELS, type MembershipRole } from '@/lib/permissions'
import { cn, formatDate } from '@/lib/utils'

interface Member {
  id: string
  role: MembershipRole
  createdAt: string
  user: { id: string; name: string; email: string }
}
interface Invitation {
  id: string
  email: string
  role: MembershipRole
  createdAt: string
  expiresAt: string
  invitedBy: { name: string } | null
}
interface TeamData {
  members: Member[]
  invitations: Invitation[]
  seats: { used: number; limit: number | null }
  currentUserId: string
  currentRole: MembershipRole
}

const ROLE_STYLE: Record<MembershipRole, string> = {
  OWNER: 'bg-violet-50 text-violet-700 border-violet-200',
  ADMIN: 'bg-amber-50 text-amber-700 border-amber-200',
  ACCOUNTANT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  SALES: 'bg-brand-50 text-brand-700 border-brand-200',
  VIEWER: 'bg-slate-50 text-slate-600 border-slate-200',
}

export default function TeamPage() {
  const { can } = useWorkspace()
  const { handleError, toast } = useFeedback()
  const dialog = useDialog()
  const [data, setData] = useState<TeamData | null>(null)
  const [inviting, setInviting] = useState(false)

  const load = useCallback(async () => {
    try {
      setData(await api<TeamData>('/api/team'))
    } catch (e) {
      handleError(e, 'Could not load your team.')
    }
  }, [handleError])

  useEffect(() => {
    load()
  }, [load])

  if (!data) return <PageLoader label="Loading team…" />
  const canManage = can('team.manage')
  const isOwner = data.currentRole === 'OWNER'

  const canEdit = (m: Member) => canManage && m.role !== 'OWNER' && m.user.id !== data.currentUserId && (m.role !== 'ADMIN' || isOwner)

  const changeRole = async (m: Member, role: MembershipRole) => {
    try {
      await api(`/api/team/${m.id}`, { method: 'PUT', body: { role } })
      toast.success(`${m.user.name} is now ${ROLE_LABELS[role].label}.`)
      load()
    } catch (e) {
      handleError(e)
    }
  }

  const remove = async (m: Member) => {
    const self = m.user.id === data.currentUserId
    const ok = await dialog.confirm({
      title: self ? 'Leave this workspace?' : `Remove ${m.user.name}?`,
      message: self
        ? 'You will lose access to this workspace until someone invites you again.'
        : 'They will lose access immediately. Documents they created stay in the workspace.',
      confirmLabel: self ? 'Leave workspace' : 'Remove member',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await api(`/api/team/${m.id}`, { method: 'DELETE' })
      if (self) {
        window.location.href = '/dashboard'
        return
      }
      toast.success(`${m.user.name} was removed.`)
      load()
    } catch (e) {
      handleError(e)
    }
  }

  const revoke = async (inv: Invitation) => {
    try {
      await api(`/api/team/invitations/${inv.id}`, { method: 'DELETE' })
      toast.success(`Invitation to ${inv.email} revoked.`)
      load()
    } catch (e) {
      handleError(e)
    }
  }

  const seatsFull = data.seats.limit !== null && data.seats.used >= data.seats.limit
  const assignable: MembershipRole[] = isOwner ? ['ADMIN', 'ACCOUNTANT', 'SALES', 'VIEWER'] : ['ACCOUNTANT', 'SALES', 'VIEWER']

  return (
    <div>
      <PageHeader title="Team" description="Manage who can access this workspace and what they can do">
        {canManage && (
          <button onClick={() => setInviting(true)} className="btn-primary">
            <UserPlus className="w-4 h-4" /> Invite member
          </button>
        )}
      </PageHeader>

      <div className="p-4 sm:p-6 lg:p-10 space-y-6 max-w-5xl animate-fade-up">
        {/* Seats */}
        <div className="card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-600/20">
            <UsersRound className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900">
              {data.seats.used} of {data.seats.limit ?? 'unlimited'} seats used
            </p>
            <p className="text-xs text-slate-500">Pending invitations count towards your plan&apos;s seats.</p>
            {data.seats.limit !== null && (
              <div className="mt-2 h-2 max-w-sm rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={cn('h-full rounded-full', seatsFull ? 'bg-amber-500' : 'bg-brand-600')}
                  style={{ width: `${Math.min(100, (data.seats.used / data.seats.limit) * 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Members */}
        <section className="card overflow-hidden">
          <div className="card-header">
            <div>
              <h2 className="section-title">Members</h2>
              <p className="section-desc">{data.members.length} people in this workspace</p>
            </div>
          </div>
          <ul className="divide-y divide-slate-100">
            {data.members.map((m) => {
              const self = m.user.id === data.currentUserId
              return (
                <li key={m.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 sm:px-6 py-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 bg-gradient-to-br from-brand-400 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ring-2 ring-white shadow-sm">
                      {m.user.name[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        <span className="truncate">{m.user.name}</span>
                        {self && <span className="text-[10px] bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100 px-1.5 py-0.5 rounded-full font-semibold">You</span>}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {m.user.email} · Joined {formatDate(m.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {canEdit(m) ? (
                      <select value={m.role} onChange={(e) => changeRole(m, e.target.value as MembershipRole)} className="input h-9 w-40 text-xs" aria-label={`Role for ${m.user.name}`}>
                        {Array.from(new Set([m.role, ...assignable])).map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r].label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={cn('badge', ROLE_STYLE[m.role])}>
                        {m.role === 'OWNER' && <ShieldCheck className="w-3 h-3" />}
                        {ROLE_LABELS[m.role].label}
                      </span>
                    )}
                    {(canEdit(m) || (self && m.role !== 'OWNER')) && (
                      <button onClick={() => remove(m)} className="icon-btn hover:text-red-600 hover:bg-red-50" title={self ? 'Leave workspace' : 'Remove member'}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>

        {/* Invitations */}
        <section className="card overflow-hidden">
          <div className="card-header">
            <div>
              <h2 className="section-title">Pending invitations</h2>
              <p className="section-desc">Invitations expire after 7 days</p>
            </div>
          </div>
          {data.invitations.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <MailPlus className="w-6 h-6 mx-auto text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">No pending invitations.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.invitations.map((inv) => (
                <li key={inv.id} className="flex items-center gap-3 px-5 sm:px-6 py-4">
                  <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">{inv.email}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {ROLE_LABELS[inv.role].label} · Sent {formatDistanceToNow(new Date(inv.createdAt), { addSuffix: true })}
                      {inv.invitedBy ? ` by ${inv.invitedBy.name}` : ''}
                    </p>
                  </div>
                  {canManage && (
                    <button onClick={() => revoke(inv)} className="btn-ghost btn-sm text-red-600 hover:bg-red-50">
                      <X className="w-3.5 h-3.5" /> Revoke
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Role reference */}
        <section className="card p-5 sm:p-6">
          <h2 className="section-title mb-4">Roles & permissions</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(Object.keys(ROLE_LABELS) as MembershipRole[]).map((r) => (
              <div key={r} className="rounded-xl ring-1 ring-slate-200/70 p-4">
                <span className={cn('badge', ROLE_STYLE[r])}>{ROLE_LABELS[r].label}</span>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">{ROLE_LABELS[r].description}</p>
              </div>
            ))}
          </div>
        </section>

        {data.members.length === 1 && data.invitations.length === 0 && canManage && (
          <EmptyState
            icon={UserPlus}
            title="Work better together"
            description="Invite your salespeople and accountant so everyone works from the same customers and documents."
            action={
              <button onClick={() => setInviting(true)} className="btn-primary">
                <UserPlus className="w-4 h-4" /> Invite a teammate
              </button>
            }
          />
        )}
      </div>

      {inviting && (
        <InviteModal
          roles={assignable}
          onClose={() => setInviting(false)}
          onInvited={() => {
            load()
          }}
        />
      )}
    </div>
  )
}

function InviteModal({ roles, onClose, onInvited }: { roles: MembershipRole[]; onClose: () => void; onInvited: () => void }) {
  const { handleError, toast } = useFeedback()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<MembershipRole>('SALES')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [link, setLink] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await api<{ inviteUrl: string }>('/api/team/invitations', { body: { email, role } })
      setLink(res.inviteUrl)
      toast.success(`Invitation sent to ${email}.`)
      onInvited()
    } catch (err) {
      if (err instanceof ApiRequestError && !err.isUpgradeRequired) setError(err.message)
      else {
        handleError(err)
        onClose()
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Invite a team member" description="They'll get an email with a link to join" icon={UserPlus} onClose={onClose}>
      {link ? (
        <div className="px-6 pb-6 space-y-4">
          <Alert variant="success">Invitation sent to {email}.</Alert>
          <div>
            <p className="label">Or share this link directly</p>
            <div className="flex gap-2">
              <input readOnly value={link} className="input font-mono text-xs" onFocus={(e) => e.target.select()} />
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(link).then(() => toast.success('Link copied.'))}
                className="btn-secondary"
                aria-label="Copy link"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <p className="hint">The link works once and expires in 7 days.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setLink(null)
                setEmail('')
              }}
              className="btn-secondary flex-1"
            >
              Invite another
            </button>
            <button onClick={onClose} className="btn-primary flex-1">
              Done
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="px-6 pb-6 space-y-4">
          {error && <Alert>{error}</Alert>}
          <div>
            <label className="label" htmlFor="inv-email">Email address</label>
            <input id="inv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="teammate@company.com" required autoFocus />
          </div>
          <div>
            <p className="label">Role</p>
            <div className="space-y-2">
              {roles.map((r) => (
                <label key={r} className={cn('flex items-start gap-3 p-3 rounded-xl ring-1 cursor-pointer transition-colors', role === r ? 'ring-brand-400 bg-brand-50/50' : 'ring-slate-200 hover:bg-slate-50')}>
                  <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} className="mt-0.5 accent-brand-600" />
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">{ROLE_LABELS[r].label}</span>
                    <span className="block text-xs text-slate-500">{ROLE_LABELS[r].description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="btn-primary flex-1">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MailPlus className="w-4 h-4" />}
              Send invitation
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
