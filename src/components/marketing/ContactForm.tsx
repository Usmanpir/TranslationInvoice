'use client'
import { useState } from 'react'
import { CheckCircle2, Loader2, Send } from 'lucide-react'
import { Alert } from '@/components/ui/States'
import { api, errorMessage } from '@/lib/api-client'

export function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', company: '', topic: 'Sales', message: '', website: '' })
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api('/api/contact', { body: form })
      setSent(true)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <div className="text-center py-10">
        <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
        <h2 className="mt-4 font-display text-xl font-bold text-slate-900">Message sent</h2>
        <p className="mt-2 text-sm text-slate-600">Thanks, {form.name.split(' ')[0]} — we’ll reply to {form.email} soon.</p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <Alert>{error}</Alert>}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="c-name">Name</label>
          <input id="c-name" value={form.name} onChange={set('name')} className="input" required minLength={2} autoComplete="name" />
        </div>
        <div>
          <label className="label" htmlFor="c-email">Email</label>
          <input id="c-email" type="email" value={form.email} onChange={set('email')} className="input" required autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="c-company">Company <span className="font-normal text-slate-400">(optional)</span></label>
          <input id="c-company" value={form.company} onChange={set('company')} className="input" autoComplete="organization" />
        </div>
        <div>
          <label className="label" htmlFor="c-topic">Topic</label>
          <select id="c-topic" value={form.topic} onChange={set('topic')} className="input">
            {['Sales', 'Support', 'Billing', 'Partnership', 'Other'].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="c-msg">Message</label>
        <textarea id="c-msg" value={form.message} onChange={set('message')} rows={6} className="input resize-none" required minLength={10} maxLength={5000} />
      </div>
      {/* Honeypot field, hidden from people and assistive tech */}
      <input type="text" name="website" value={form.website} onChange={set('website')} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <button type="submit" disabled={busy} className="btn-primary">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        Send message
      </button>
    </form>
  )
}
