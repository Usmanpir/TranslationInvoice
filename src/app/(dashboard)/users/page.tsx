'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { formatDate } from '@/lib/utils'
import { useDialog } from '@/components/ui/Dialog'
import { Modal } from '@/components/ui/Modal'
import { Alert, PageLoader } from '@/components/ui/States'
import {
  Loader2,
  Plus,
  Shield,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  Eye,
  EyeOff,
} from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
  role: string
  companyName: string | null
  phone: string | null
  createdAt: string
  _count: { customers: number; invoices: number; quotations: number }
}

export default function UsersPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const dialog = useDialog()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [error, setError] = useState('')

  const isAdmin = session?.user?.role === 'admin'

  useEffect(() => {
    if (session && !isAdmin) {
      router.push('/dashboard')
      return
    }
    fetchUsers()
  }, [session, isAdmin, router])

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users')
      if (!res.ok) {
        router.push('/dashboard')
        return
      }
      const data = await res.json()
      setUsers(data)
    } catch {
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const toggleRole = async (userId: string, currentRole: string) => {
    if (userId === session?.user?.id) return
    const newRole = currentRole === 'admin' ? 'user' : 'admin'
    const ok = await dialog.confirm({
      title: `Change role to ${newRole}?`,
      message: `This user will ${newRole === 'admin' ? 'gain admin privileges.' : 'lose admin privileges.'}`,
      confirmLabel: `Make ${newRole}`,
      variant: 'warning',
    })
    if (!ok) return

    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })

    if (res.ok) {
      setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)))
    } else {
      const data = await res.json()
      await dialog.alert({
        title: 'Could not update role',
        message: data.error || 'Failed to update role',
        variant: 'danger',
      })
    }
  }

  const deleteUser = async (userId: string, userName: string) => {
    if (userId === session?.user?.id) return
    const ok = await dialog.confirm({
      title: `Delete ${userName}?`,
      message: 'This will permanently delete the user and all of their customers, invoices, and quotations.',
      confirmLabel: 'Delete user',
      variant: 'danger',
    })
    if (!ok) return

    const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
    if (res.ok) {
      setUsers(users.filter((u) => u.id !== userId))
    } else {
      const data = await res.json()
      await dialog.alert({
        title: 'Could not delete user',
        message: data.error || 'Failed to delete user',
        variant: 'danger',
      })
    }
  }

  if (loading) {
    return <PageLoader label="Loading users…" />
  }

  return (
    <div>
      <PageHeader title="User Management" description="Manage users and their roles">
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <UserPlus className="w-4 h-4" />
          Add User
        </button>
      </PageHeader>

      <div className="p-4 sm:p-6 lg:p-10 animate-fade-up">
        {error && <Alert className="mb-6">{error}</Alert>}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-5 mb-8">
          {[
            { label: 'Total Users', value: users.length, icon: Users, gradient: 'from-brand-400 to-brand-600' },
            { label: 'Admins', value: users.filter((u) => u.role === 'admin').length, icon: ShieldCheck, gradient: 'from-amber-400 to-orange-500' },
            { label: 'Regular Users', value: users.filter((u) => u.role === 'user').length, icon: Shield, gradient: 'from-emerald-400 to-teal-600' },
          ].map((s) => (
            <div key={s.label} className="card-interactive p-5">
              <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-lg shadow-slate-900/10 ring-1 ring-inset ring-white/20`}>
                  <s.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-display text-2xl font-bold text-slate-900 tabular-nums">{s.value}</p>
                  <p className="text-xs font-medium text-slate-500">{s.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Users Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th className="text-left">User</th>
                  <th className="text-left">Role</th>
                  <th className="text-left hidden md:table-cell">Company</th>
                  <th className="text-center hidden lg:table-cell">Data</th>
                  <th className="text-left hidden md:table-cell">Joined</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isSelf = user.id === session?.user?.id
                  return (
                    <tr key={user.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-gradient-to-br from-brand-400 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ring-2 ring-white shadow-sm">
                            {user.name[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                              <span className="truncate">{user.name}</span>
                              {isSelf && (
                                <span className="text-[10px] bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100 px-1.5 py-0.5 rounded-full font-semibold">
                                  You
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-slate-500 truncate">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`badge capitalize ${
                            user.role === 'admin'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          {user.role === 'admin' ? (
                            <ShieldCheck className="w-3 h-3" />
                          ) : (
                            <Shield className="w-3 h-3" />
                          )}
                          {user.role}
                        </span>
                      </td>
                      <td className="text-sm text-slate-600 hidden md:table-cell">
                        {user.companyName || '-'}
                      </td>
                      <td className="text-center hidden lg:table-cell">
                        <div className="flex items-center justify-center gap-2 text-xs text-slate-600">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 whitespace-nowrap">{user._count.customers} customers</span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 whitespace-nowrap">{user._count.invoices} invoices</span>
                        </div>
                      </td>
                      <td className="text-sm text-slate-500 hidden md:table-cell whitespace-nowrap">
                        {formatDate(user.createdAt)}
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => toggleRole(user.id, user.role)}
                            disabled={isSelf}
                            className="icon-btn hover:text-amber-600 hover:bg-amber-50"
                            title={isSelf ? 'Cannot change own role' : `Make ${user.role === 'admin' ? 'user' : 'admin'}`}
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteUser(user.id, user.name)}
                            disabled={isSelf}
                            className="icon-btn hover:text-red-600 hover:bg-red-50"
                            title={isSelf ? 'Cannot delete own account' : 'Delete user'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onUserAdded={(user) => {
            setUsers([user, ...users])
            setShowAddModal(false)
          }}
        />
      )}
    </div>
  )
}

function AddUserModal({
  onClose,
  onUserAdded,
}: {
  onClose: () => void
  onUserAdded: (user: User) => void
}) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    companyName: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          companyName: formData.companyName || undefined,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create user')
      } else {
        onUserAdded({ ...data, _count: { customers: 0, invoices: 0, quotations: 0 } })
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Add New User" description="Create an account and assign a role" icon={UserPlus} onClose={onClose}>
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          {error && <Alert>{error}</Alert>}

          <div>
            <label className="label">Full name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <label className="label">Email address</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input"
              placeholder="user@company.com"
              required
            />
          </div>

          <div>
            <label className="label">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="input pr-11"
                placeholder="Min. 8 characters"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 icon-btn"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="label">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="input"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="label">Company name <span className="font-normal text-slate-400">(optional)</span></label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              className="input"
              placeholder="Company Inc."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create User
            </button>
          </div>
        </form>
    </Modal>
  )
}
