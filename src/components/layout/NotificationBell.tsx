'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Bell, CheckCheck } from 'lucide-react'
import { api } from '@/lib/api-client'
import { cn } from '@/lib/utils'

interface NotificationItem {
  id: string
  title: string
  body: string | null
  link: string | null
  readAt: string | null
  createdAt: string
}

export function NotificationBell({ dark = false }: { dark?: boolean }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unread, setUnread] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    try {
      const data = await api<{ items: NotificationItem[]; unread: number }>('/api/notifications')
      setItems(data.items)
      setUnread(data.unread)
    } catch {
      // Notifications are non-critical; stay quiet on failure.
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    load()
    const t = window.setInterval(load, 60_000)
    return () => window.clearInterval(t)
  }, [load])

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const markAllRead = async () => {
    setItems((list) => list.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })))
    setUnread(0)
    await api('/api/notifications', { body: {} }).catch(() => load())
  }

  const markRead = (id: string) => {
    const target = items.find((n) => n.id === id)
    if (!target || target.readAt) return
    setItems((list) => list.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)))
    setUnread((u) => Math.max(0, u - 1))
    api('/api/notifications', { body: { ids: [id] } }).catch(() => {})
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={unread ? `Notifications (${unread} unread)` : 'Notifications'}
        aria-expanded={open}
        className={cn(
          'relative inline-flex items-center justify-center w-10 h-10 rounded-xl transition-colors',
          dark
            ? 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
            : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-[0_1px_2px_0_rgb(15_23_42/0.05)]'
        )}
      >
        <Bell className="w-[18px] h-[18px]" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            'z-50 w-[min(22rem,calc(100vw-2rem))] rounded-2xl bg-white shadow-elevated ring-1 ring-slate-900/5 overflow-hidden animate-scale-in',
            // The desktop sidebar clips overflow, so its dropdown is positioned against the viewport.
            dark ? 'fixed left-[16.75rem] top-4' : 'absolute right-0 mt-2'
          )}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            {unread > 0 && (
              <button onClick={markAllRead} className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {!loaded ? (
              <div className="p-4 space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="skeleton h-10 rounded-lg" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <Bell className="w-6 h-6 mx-auto text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">You're all caught up.</p>
              </div>
            ) : (
              items.map((n) => {
                const content = (
                  <div className={cn('flex gap-3 px-4 py-3 hover:bg-slate-50 transition-colors', !n.readAt && 'bg-brand-50/40')}>
                    <span className={cn('mt-1.5 w-2 h-2 rounded-full flex-shrink-0', n.readAt ? 'bg-transparent' : 'bg-brand-500')} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">{n.title}</p>
                      {n.body && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>}
                      <p className="text-[11px] text-slate-400 mt-1">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                )
                return n.link ? (
                  <Link
                    key={n.id}
                    href={n.link}
                    onClick={() => {
                      markRead(n.id)
                      setOpen(false)
                    }}
                    className="block border-b border-slate-50 last:border-0"
                  >
                    {content}
                  </Link>
                ) : (
                  <button key={n.id} onClick={() => markRead(n.id)} className="block w-full text-left border-b border-slate-50 last:border-0">
                    {content}
                  </button>
                )
              })
            )}
          </div>
          <Link
            href="/profile#notifications"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-center text-xs font-medium text-slate-500 hover:text-slate-900 border-t border-slate-100"
          >
            Notification preferences
          </Link>
        </div>
      )}
    </div>
  )
}
