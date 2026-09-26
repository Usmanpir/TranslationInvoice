'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  BarChart3,
  Building2,
  Check,
  ChevronsUpDown,
  CreditCard,
  FileQuestion,
  History,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  Plus,
  Receipt,
  ShieldCheck,
  UserCog,
  Users,
  UsersRound,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api-client'
import type { Permission } from '@/lib/permissions'
import { Logo } from '@/components/ui/Logo'
import { useWorkspace } from '@/components/providers/WorkspaceProvider'
import { useFeedback } from '@/components/providers/FeedbackProvider'
import { NotificationBell } from './NotificationBell'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

interface NavItem {
  name: string
  href: string
  icon: LucideIcon
  permission?: Permission
}

const SECTIONS: { title?: string; items: NavItem[] }[] = [
  { items: [{ name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: 'dashboard.view' }] },
  {
    title: 'Business',
    items: [
      { name: 'Customers', href: '/customers', icon: Users, permission: 'customer.view' },
      { name: 'Invoices', href: '/invoices', icon: Receipt, permission: 'invoice.view' },
      { name: 'Quotations', href: '/quotations', icon: FileQuestion, permission: 'quotation.view' },
      { name: 'Payments', href: '/payments', icon: Wallet, permission: 'payment.view' },
    ],
  },
  { title: 'Insights', items: [{ name: 'Reports', href: '/reports', icon: BarChart3, permission: 'report.view' }] },
  {
    title: 'Workspace',
    items: [
      { name: 'Team', href: '/team', icon: UsersRound, permission: 'team.view' },
      { name: 'Company settings', href: '/settings', icon: Building2, permission: 'settings.view' },
      { name: 'Billing', href: '/billing', icon: CreditCard, permission: 'billing.view' },
      { name: 'Audit log', href: '/audit', icon: History, permission: 'audit.view' },
    ],
  },
]

function NavLink({ item, active, onClick }: { item: NavItem; active: boolean; onClick?: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150',
        active
          ? 'text-white bg-gradient-to-r from-white/[0.12] to-white/[0.04] ring-1 ring-inset ring-white/10 shadow-[0_4px_16px_-6px_rgb(0_0_0/0.5)]'
          : 'text-ink-400 hover:text-white hover:bg-white/[0.05]'
      )}
    >
      {active && (
        <span
          className="absolute -left-3 top-1/2 -translate-y-1/2 h-5 w-1 bg-gradient-to-b from-brand-300 to-brand-500 rounded-r-full shadow-[0_0_12px_rgb(54_170_248/0.8)]"
          aria-hidden
        />
      )}
      <item.icon
        className={cn('w-[18px] h-[18px] flex-shrink-0 transition-colors', active ? 'text-brand-300' : 'text-ink-500 group-hover:text-ink-300')}
      />
      <span className="flex-1 truncate">{item.name}</span>
    </Link>
  )
}

interface WorkspaceOption {
  id: string
  name: string
  role: string
  active: boolean
}

function WorkspaceSwitcher() {
  const { organization, subscription } = useWorkspace()
  const { handleError } = useFeedback()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<WorkspaceOption[] | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    if (!options) api<WorkspaceOption[]>('/api/organizations').then(setOptions).catch(() => setOptions([]))
    const onClick = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open, options])

  const switchTo = async (id: string) => {
    if (id === organization.id) return setOpen(false)
    try {
      await api('/api/organizations', { method: 'PUT', body: { organizationId: id } })
      setOpen(false)
      router.push('/dashboard')
      router.refresh()
    } catch (e) {
      handleError(e)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.04] ring-1 ring-inset ring-white/[0.07] hover:bg-white/[0.07] transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-ink-700 to-ink-800 ring-1 ring-white/10 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 overflow-hidden">
          {organization.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={organization.logoUrl} alt="" className="w-full h-full object-contain bg-card" />
          ) : (
            organization.name[0]?.toUpperCase()
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-ink-100 truncate">{organization.name}</p>
          <p className="text-[11px] text-ink-500 truncate">
            {subscription.subscribedPlanName}
            {subscription.isTrial ? ' · Trial' : ''}
          </p>
        </div>
        <ChevronsUpDown className="w-4 h-4 text-ink-500 flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl bg-ink-900 ring-1 ring-white/10 shadow-2xl p-1.5 animate-scale-in">
          <p className="px-2.5 pt-1.5 pb-1 text-[10px] font-semibold text-ink-500 uppercase tracking-[0.12em]">Workspaces</p>
          {!options ? (
            <div className="px-2.5 py-2 text-xs text-ink-500">Loading…</div>
          ) : (
            options.map((o) => (
              <button
                key={o.id}
                onClick={() => switchTo(o.id)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-ink-300 hover:bg-white/[0.06] hover:text-white"
              >
                <span className="flex-1 truncate text-left">{o.name}</span>
                <span className="text-[10px] text-ink-500 capitalize">{o.role.toLowerCase()}</span>
                {o.id === organization.id && <Check className="w-3.5 h-3.5 text-brand-300" />}
              </button>
            ))
          )}
          <Link
            href="/onboarding?new=1"
            onClick={() => setOpen(false)}
            className="mt-1 flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-ink-400 hover:bg-white/[0.06] hover:text-white border-t border-white/5"
          >
            <Plus className="w-3.5 h-3.5" /> Create a new workspace
          </Link>
        </div>
      )}
    </div>
  )
}

function SidebarContents({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const { user, can } = useWorkspace()
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const sections = SECTIONS.map((s) => ({ ...s, items: s.items.filter((i) => !i.permission || can(i.permission)) })).filter(
    (s) => s.items.length > 0
  )

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-ink-950 text-ink-300 overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -top-24 -left-20 w-72 h-72 rounded-full bg-[radial-gradient(closest-side,rgb(12_143_233/0.22),transparent)]" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-white/10 via-white/5 to-transparent" />

      <div className="relative flex items-center justify-between gap-2 px-5 pt-5 pb-3">
        <Link href="/dashboard" onClick={onNavigate} className="block">
          <Logo dark />
        </Link>
        <div className="hidden lg:block">
          <NotificationBell dark />
        </div>
      </div>

      <div className="relative px-3 pb-3">
        <WorkspaceSwitcher />
      </div>

      {can('invoice.create') && (
        <div className="relative px-3 pb-1">
          <Link
            href="/invoices/new"
            onClick={onNavigate}
            className="flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-semibold text-white bg-gradient-to-b from-brand-500 to-brand-600 shadow-btn-brand hover:to-brand-700 transition-all hover:-translate-y-px"
          >
            <Plus className="w-4 h-4" />
            New Invoice
          </Link>
        </div>
      )}

      <nav className="relative flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {sections.map((section, i) => (
          <div key={section.title ?? i} className={cn(i > 0 && 'pt-4')}>
            {section.title && (
              <p className="px-3 pb-1.5 text-[10px] font-semibold text-ink-500 uppercase tracking-[0.12em]">{section.title}</p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink key={item.href} item={item} active={isActive(item.href)} onClick={onNavigate} />
              ))}
            </div>
          </div>
        ))}

        {user.isSuperAdmin && (
          <div className="pt-4">
            <p className="px-3 pb-1.5 text-[10px] font-semibold text-ink-500 uppercase tracking-[0.12em]">Platform</p>
            <NavLink item={{ name: 'SaaS admin', href: '/saas-admin', icon: ShieldCheck }} active={isActive('/saas-admin')} onClick={onNavigate} />
          </div>
        )}
      </nav>

      <div className="relative border-t border-white/[0.06] px-3 py-3 space-y-0.5">
        <ThemeToggle variant="segmented" onDark className="w-full mb-2" />
        <NavLink item={{ name: 'Profile & security', href: '/profile', icon: UserCog }} active={isActive('/profile')} onClick={onNavigate} />
        <NavLink item={{ name: 'Help & support', href: '/contact', icon: LifeBuoy }} active={false} onClick={onNavigate} />
        <div className="flex items-center gap-3 p-2.5 mt-2 rounded-xl bg-white/[0.04] ring-1 ring-inset ring-white/[0.06]">
          <div className="relative w-9 h-9 bg-gradient-to-br from-brand-400 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ring-2 ring-white/10">
            {user.name?.[0]?.toUpperCase()}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-ink-950" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-ink-100 truncate">{user.name}</p>
            <p className="text-[11px] text-ink-500 truncate">{user.email}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            title="Sign out"
            aria-label="Sign out"
            className="w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center text-ink-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 z-40 flex-col">
      <SidebarContents />
    </aside>
  )
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()

  useEffect(() => setMounted(true), [])
  useEffect(() => setOpen(false), [pathname])

  // Close the drawer if the viewport grows into the desktop layout (e.g. tablet rotation).
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const onChange = () => mq.matches && setOpen(false)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 bg-card text-slate-700 shadow-[0_1px_2px_0_rgb(15_23_42/0.05)] hover:bg-slate-50"
      >
        <Menu className="w-5 h-5" />
      </button>
      {mounted &&
        open &&
        createPortal(
          <div className="lg:hidden fixed inset-0 z-[60]">
            <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm animate-fade-in" onClick={() => setOpen(false)} aria-hidden />
            <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-ink-950 shadow-2xl flex flex-col animate-slide-in-left">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="absolute top-5 right-3 z-10 w-8 h-8 rounded-lg flex items-center justify-center text-ink-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex-1 min-h-0">
                <SidebarContents onNavigate={() => setOpen(false)} />
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
