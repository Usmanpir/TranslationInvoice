'use client'
import { useEffect, useState } from 'react'
import { signIn, signOut, useSession } from 'next-auth/react'
import { Bell, Eye, EyeOff, Globe2, KeyRound, Loader2, Lock, LogOut, Save, ShieldCheck, User } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Alert, PageLoader } from '@/components/ui/States'
import { FormSection } from '@/components/forms/FormSection'
import { api, ApiRequestError } from '@/lib/api-client'
import { ROLE_LABELS } from '@/lib/permissions'
import { useDialog } from '@/components/ui/Dialog'
import { useWorkspace } from '@/components/providers/WorkspaceProvider'
import { useFeedback } from '@/components/providers/FeedbackProvider'

const TIMEZONES = ['Asia/Dubai', 'Asia/Riyadh', 'Asia/Qatar', 'Asia/Kuwait', 'Asia/Bahrain', 'Asia/Muscat', 'Asia/Karachi', 'Asia/Kolkata', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'UTC']
const DATE_FORMATS = [
  { value: 'MMM dd, yyyy', label: 'Sep 25, 2026' },
  { value: 'dd/MM/yyyy', label: '25/09/2026' },
  { value: 'MM/dd/yyyy', label: '09/25/2026' },
  { value: 'yyyy-MM-dd', label: '2026-09-25' },
]

interface Profile {
  name: string
  email: string
  phone: string | null
  locale: string
  timezone: string
  dateFormat: string
}

interface NotificationPref {
  type: string
  label: string
  description: string
  inApp: boolean
  email: boolean
}

export default function ProfilePage() {
  const { update } = useSession()
  const { role } = useWorkspace()
  const { handleError, toast } = useFeedback()
  const dialog = useDialog()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [prefs, setPrefs] = useState<NotificationPref[] | null>(null)
  const [savingPrefs, setSavingPrefs] = useState(false)

  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSaving, setPwSaving] = useState(false)

  useEffect(() => {
    api<Profile>('/api/profile').then(setProfile).catch((e) => handleError(e, 'Could not load your profile.'))
    api<NotificationPref[]>('/api/profile/notifications').then(setPrefs).catch(() => setPrefs([]))
  }, [handleError])

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    setError('')
    try {
      const saved = await api<Profile>('/api/profile', {
        method: 'PUT',
        body: { name: profile.name, phone: profile.phone, locale: profile.locale, timezone: profile.timezone, dateFormat: profile.dateFormat },
      })
      setProfile(saved)
      await update({ name: saved.name })
      toast.success('Profile saved.')
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'VALIDATION_ERROR') setError(err.message)
      else handleError(err)
    } finally {
      setSaving(false)
    }
  }

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwError('')
    if (pw.newPassword !== pw.confirm) return setPwError('The new passwords do not match.')
    setPwSaving(true)
    try {
      await api('/api/profile/password', { body: { currentPassword: pw.currentPassword, newPassword: pw.newPassword } })
      // All sessions were revoked server-side; sign this browser back in with the new password.
      const res = await signIn('credentials', { email: profile!.email, password: pw.newPassword, redirect: false })
      setPw({ currentPassword: '', newPassword: '', confirm: '' })
      if (res?.error) {
        await signOut({ callbackUrl: '/login' })
        return
      }
      toast.success('Password changed. Other devices have been signed out.')
    } catch (err) {
      if (err instanceof ApiRequestError) setPwError(err.message)
      else handleError(err)
    } finally {
      setPwSaving(false)
    }
  }

  const logoutEverywhere = async () => {
    const ok = await dialog.confirm({
      title: 'Sign out of all devices?',
      message: 'Every active session, including this one, will be signed out immediately.',
      confirmLabel: 'Sign out everywhere',
      variant: 'warning',
    })
    if (!ok) return
    try {
      await api('/api/profile/sessions', { method: 'DELETE' })
      await signOut({ callbackUrl: '/login' })
    } catch (err) {
      handleError(err)
    }
  }

  const togglePref = (type: string, channel: 'inApp' | 'email') =>
    setPrefs((list) => list?.map((p) => (p.type === type ? { ...p, [channel]: !p[channel] } : p)) ?? null)

  const savePrefs = async () => {
    if (!prefs) return
    setSavingPrefs(true)
    try {
      await api('/api/profile/notifications', {
        method: 'PUT',
        body: { prefs: Object.fromEntries(prefs.map((p) => [p.type, { inApp: p.inApp, email: p.email }])) },
      })
      toast.success('Notification preferences saved.')
    } catch (err) {
      handleError(err)
    } finally {
      setSavingPrefs(false)
    }
  }

  if (!profile) return <PageLoader label="Loading profile…" />
  const set = (field: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setProfile((p) => (p ? { ...p, [field]: e.target.value } : p))

  return (
    <div>
      <PageHeader title="Profile & security" description="Your personal details, preferences and sign-in security" />
      <div className="p-4 sm:p-6 lg:p-10">
        <div className="max-w-3xl space-y-5 animate-fade-up">
          {/* Banner */}
          <div className="card overflow-hidden">
            <div className="relative h-24 bg-gradient-to-r from-brand-500 via-indigo-500 to-violet-500">
              <div aria-hidden className="absolute inset-0 bg-grid-dark opacity-50" />
            </div>
            <div className="relative px-5 sm:px-6 pb-5 flex items-end gap-4">
              <div className="relative -mt-10 flex-shrink-0 w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-400 to-indigo-600 ring-4 ring-white shadow-elevated flex items-center justify-center text-white font-display text-2xl font-bold">
                {profile.name[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 pb-1">
                <p className="font-display text-lg font-bold text-slate-900 truncate">{profile.name}</p>
                <p className="text-sm text-slate-500 truncate">{profile.email}</p>
              </div>
              <span className="ml-auto mb-1.5 badge bg-slate-50 text-slate-600 border-slate-200">{ROLE_LABELS[role].label}</span>
            </div>
          </div>

          <form onSubmit={saveProfile} className="space-y-5">
            {error && <Alert>{error}</Alert>}
            <FormSection icon={User} title="Personal information" description="How you appear to your team">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="name">Full name</label>
                  <input id="name" value={profile.name} onChange={set('name')} className="input" required minLength={2} maxLength={120} />
                </div>
                <div>
                  <label className="label" htmlFor="phone">Phone</label>
                  <input id="phone" value={profile.phone ?? ''} onChange={set('phone')} className="input" placeholder="+971 50 000 0000" maxLength={50} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="email">Email address</label>
                  <div className="relative">
                    <input id="email" type="email" value={profile.email} className="input pr-10 cursor-not-allowed" disabled />
                    <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <p className="hint">Your email is your sign-in and can&apos;t be changed here.</p>
                </div>
              </div>
            </FormSection>

            <FormSection icon={Globe2} title="Preferences" description="Language, timezone and date display">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="label" htmlFor="locale">Language</label>
                  <select id="locale" value={profile.locale} onChange={set('locale')} className="input">
                    <option value="en">English</option>
                    <option value="ar">العربية (Arabic) — coming soon</option>
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="tz">Timezone</label>
                  <select id="tz" value={profile.timezone} onChange={set('timezone')} className="input">
                    {Array.from(new Set([profile.timezone, ...TIMEZONES])).map((tz) => (
                      <option key={tz} value={tz}>
                        {tz.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="df">Date format</label>
                  <select id="df" value={profile.dateFormat} onChange={set('dateFormat')} className="input">
                    {DATE_FORMATS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </FormSection>

            <div className="flex justify-end">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save changes
              </button>
            </div>
          </form>

          {/* Security */}
          <FormSection icon={ShieldCheck} title="Security" description="Change your password or sign out of other devices">
            <form onSubmit={changePassword} className="space-y-4">
              {pwError && <Alert>{pwError}</Alert>}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="label" htmlFor="cur">Current password</label>
                  <input id="cur" type={showPw ? 'text' : 'password'} value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} className="input" autoComplete="current-password" required />
                </div>
                <div>
                  <label className="label" htmlFor="new">New password</label>
                  <input id="new" type={showPw ? 'text' : 'password'} value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} className="input" autoComplete="new-password" minLength={8} required />
                </div>
                <div>
                  <label className="label" htmlFor="confirm">Confirm new password</label>
                  <input id="confirm" type={showPw ? 'text' : 'password'} value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} className="input" autoComplete="new-password" minLength={8} required />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button type="button" onClick={() => setShowPw((s) => !s)} className="btn-ghost text-xs">
                  {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showPw ? 'Hide' : 'Show'} passwords
                </button>
                <button type="submit" disabled={pwSaving} className="btn-secondary">
                  {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  Change password
                </button>
              </div>
              <p className="hint">At least 8 characters, with at least one letter and one number. Changing it signs out your other devices.</p>
            </form>
            <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Active sessions</p>
                <p className="text-xs text-slate-500">Lost a device or used a shared computer? Sign out everywhere at once.</p>
              </div>
              <button onClick={logoutEverywhere} className="btn-secondary text-red-600 hover:bg-red-50 hover:border-red-200">
                <LogOut className="w-4 h-4" /> Sign out of all devices
              </button>
            </div>
          </FormSection>

          {/* Notifications */}
          <div id="notifications" className="scroll-mt-24">
            <FormSection icon={Bell} title="Notifications" description="Choose what you hear about in this workspace">
              {!prefs ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="skeleton h-10 rounded-lg" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto -mx-1">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[11px] uppercase tracking-[0.06em] text-slate-500">
                          <th className="text-left font-semibold px-1 pb-2">Event</th>
                          <th className="font-semibold px-3 pb-2 w-20">In-app</th>
                          <th className="font-semibold px-3 pb-2 w-20">Email</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {prefs.map((p) => (
                          <tr key={p.type}>
                            <td className="px-1 py-3">
                              <p className="font-medium text-slate-900">{p.label}</p>
                              <p className="text-xs text-slate-500">{p.description}</p>
                            </td>
                            <td className="text-center">
                              <input type="checkbox" checked={p.inApp} onChange={() => togglePref(p.type, 'inApp')} className="w-4 h-4 accent-brand-600" aria-label={`${p.label} in-app`} />
                            </td>
                            <td className="text-center">
                              <input type="checkbox" checked={p.email} onChange={() => togglePref(p.type, 'email')} className="w-4 h-4 accent-brand-600" aria-label={`${p.label} email`} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end mt-4">
                    <button onClick={savePrefs} disabled={savingPrefs} className="btn-secondary">
                      {savingPrefs ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save preferences
                    </button>
                  </div>
                </>
              )}
            </FormSection>
          </div>
        </div>
      </div>
    </div>
  )
}
