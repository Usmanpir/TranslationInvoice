'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { formatDate } from '@/lib/utils'
import { useDialog } from '@/components/ui/Dialog'
import {
  Loader2,
  Plus,
  Shield,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
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
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="User Management" description="Manage users and their roles">
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <UserPlus className="w-4 h-4" />
          Add User
        </button>
      </PageHeader>

      <div className="p-4 sm:p-6 lg:p-8">
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-6">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{users.length}</p>
                <p className="text-xs text-slate-500">Total Users</p>
              </div>
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {users.filter((u) => u.role === 'admin').length}
                </p>
                <p className="text-xs text-slate-500">Admins</p>
              </div>
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {users.filter((u) => u.role === 'user').length}
                </p>
                <p className="text-xs text-slate-500">Regular Users</p>
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">
                  User
                </th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">
                  Role
                </th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">
                  Company
                </th>
                <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">
                  Data
                </th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">
                  Joined
                </th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => {
                const isSelf = user.id === session?.user?.id
                return (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-brand-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {user.name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {user.name}
                            {isSelf && (
                              <span className="ml-2 text-[10px] bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded-full font-medium">
                                You
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          user.role === 'admin'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
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
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {user.companyName || '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
                        <span>{user._count.customers} customers</span>
                        <span>{user._count.invoices} invoices</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => toggleRole(user.id, user.role)}
                          disabled={isSelf}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title={isSelf ? 'Cannot change own role' : `Make ${user.role === 'admin' ? 'user' : 'admin'}`}
                        >
                          <ShieldCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteUser(user.id, user.name)}
                          disabled={isSelf}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Add New User</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

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
                className="input pr-10"
                placeholder="Min. 8 characters"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
            <label className="label">Company name (optional)</label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              className="input"
              placeholder="Company Inc."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create User
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
