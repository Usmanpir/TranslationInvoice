'use client'
import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageLoader } from '@/components/ui/States'
import { useFeedback } from '@/components/providers/FeedbackProvider'
import { api } from '@/lib/api-client'

function Row({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <li className="flex items-center gap-3 px-5 sm:px-6 py-3.5">
      {ok ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-amber-500" />}
      <span className="flex-1 text-sm text-slate-900">{label}</span>
      {detail && <span className="text-xs text-slate-500 font-mono truncate max-w-[50%]">{detail}</span>}
    </li>
  )
}

/** Configuration health. Shows whether things are set — never their values. */
export default function SaasSystemPage() {
  const { handleError } = useFeedback()
  const [s, setS] = useState<any>(null)
  useEffect(() => {
    api('/api/saas-admin/system').then(setS).catch((e) => handleError(e))
  }, [handleError])
  if (!s) return <PageLoader />
  return (
    <div>
      <PageHeader title="System settings" description="Environment configuration status" />
      <div className="p-4 sm:p-6 lg:p-10 max-w-3xl space-y-5">
        <ul className="card divide-y divide-slate-100 overflow-hidden">
          <Row label="Auth secret (NEXTAUTH_SECRET)" ok={s.auth.secret} />
          <Row label="Auth URL (NEXTAUTH_URL)" ok detail={s.auth.url} />
          <Row label="Public app URL (NEXT_PUBLIC_APP_URL)" ok={Boolean(s.appUrl)} detail={s.appUrl ?? 'not set — emails fall back to NEXTAUTH_URL'} />
          <Row label="Stripe secret key" ok={s.stripe.secretKey} />
          <Row label="Stripe webhook secret" ok={s.stripe.webhookSecret} />
          <Row label="Manual / bank-transfer billing" ok={s.manualBilling} detail={s.manualBilling ? 'enabled' : 'disabled'} />
          <Row label="Email provider" ok={s.email.provider === 'resend'} detail={`${s.email.provider} · ${s.email.from}`} />
          <Row label="Cron secret (CRON_SECRET)" ok={s.cron.secret} />
        </ul>
        <p className="text-sm text-slate-500">
          Active billing methods: {s.billingProviders.length ? s.billingProviders.map((p: any) => p.label).join(', ') : 'none'}. Values are configured as environment variables in Vercel and are never displayed here.
        </p>
      </div>
    </div>
  )
}
