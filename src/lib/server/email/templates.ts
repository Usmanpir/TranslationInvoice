import 'server-only'

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'InvoiceFlow'

export function appUrl(path = '') {
  const base = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '')
  return `${base}${path}`
}

function esc(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

interface LayoutInput {
  preheader: string
  heading: string
  paragraphs: string[]
  cta?: { label: string; url: string }
  footnote?: string
}

function layout({ preheader, heading, paragraphs, cta, footnote }: LayoutInput) {
  const html = `<!doctype html><html><body style="margin:0;background:#f4f6fa;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0f172a">
<span style="display:none;max-height:0;overflow:hidden">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;border:1px solid #e3e8ef;overflow:hidden">
<tr><td style="height:6px;background:linear-gradient(90deg,#0c8fe9,#6366f1,#8b5cf6)"></td></tr>
<tr><td style="padding:32px">
<p style="margin:0 0 24px;font-weight:700;font-size:18px">Invoice<span style="color:#0070c7">Flow</span></p>
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3">${esc(heading)}</h1>
${paragraphs.map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#334155">${esc(p)}</p>`).join('')}
${cta ? `<p style="margin:24px 0"><a href="${esc(cta.url)}" style="display:inline-block;background:#0070c7;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:12px">${esc(cta.label)}</a></p>` : ''}
${footnote ? `<p style="margin:24px 0 0;font-size:12px;color:#94a3b8">${esc(footnote)}</p>` : ''}
</td></tr></table>
<p style="font-size:12px;color:#94a3b8;margin:16px 0 0">© ${new Date().getFullYear()} ${esc(APP_NAME)}</p>
</td></tr></table></body></html>`

  const text = [heading, '', ...paragraphs, ...(cta ? ['', `${cta.label}: ${cta.url}`] : []), ...(footnote ? ['', footnote] : [])].join('\n')
  return { html, text }
}

export const emailTemplates = {
  welcome: (p: { name: string; organizationName: string }) => ({
    subject: `Welcome to ${APP_NAME}`,
    ...layout({
      preheader: 'Your workspace is ready.',
      heading: `Welcome, ${p.name}!`,
      paragraphs: [
        `Your ${APP_NAME} workspace for ${p.organizationName} is ready, and your free trial has started.`,
        'Add your company details, invite your team and send your first invoice in minutes.',
      ],
      cta: { label: 'Open your dashboard', url: appUrl('/dashboard') },
    }),
  }),

  verifyEmail: (p: { name: string; url: string }) => ({
    subject: 'Verify your email address',
    ...layout({
      preheader: 'Confirm your email to secure your account.',
      heading: 'Confirm your email',
      paragraphs: [`Hi ${p.name}, please confirm this is your email address.`],
      cta: { label: 'Verify email', url: p.url },
      footnote: "If you didn't create an account, you can ignore this email.",
    }),
  }),

  passwordReset: (p: { name: string; url: string }) => ({
    subject: 'Reset your password',
    ...layout({
      preheader: 'A password reset was requested for your account.',
      heading: 'Reset your password',
      paragraphs: [`Hi ${p.name}, we received a request to reset your password. This link expires in 1 hour.`],
      cta: { label: 'Choose a new password', url: p.url },
      footnote: "If you didn't request this, you can safely ignore this email — your password won't change.",
    }),
  }),

  teamInvitation: (p: { inviterName: string; organizationName: string; roleLabel: string; url: string }) => ({
    subject: `${p.inviterName} invited you to ${p.organizationName} on ${APP_NAME}`,
    ...layout({
      preheader: `Join ${p.organizationName} on ${APP_NAME}.`,
      heading: `Join ${p.organizationName}`,
      paragraphs: [`${p.inviterName} invited you to join ${p.organizationName} as ${p.roleLabel}.`, 'This invitation expires in 7 days.'],
      cta: { label: 'Accept invitation', url: p.url },
    }),
  }),

  invoiceCreated: (p: { organizationName: string; invoiceNumber: string; amount: string; dueDate: string; url: string }) => ({
    subject: `Invoice ${p.invoiceNumber} created`,
    ...layout({
      preheader: `${p.invoiceNumber} for ${p.amount}`,
      heading: `Invoice ${p.invoiceNumber}`,
      paragraphs: [`A new invoice for ${p.amount} was created in ${p.organizationName}. It is due on ${p.dueDate}.`],
      cta: { label: 'View invoice', url: p.url },
    }),
  }),

  paymentReceived: (p: { invoiceNumber: string; amount: string; url: string }) => ({
    subject: `Payment received for ${p.invoiceNumber}`,
    ...layout({
      preheader: `${p.amount} received`,
      heading: 'Payment received',
      paragraphs: [`A payment of ${p.amount} was recorded against invoice ${p.invoiceNumber}.`],
      cta: { label: 'View invoice', url: p.url },
    }),
  }),

  invoiceOverdue: (p: { invoiceNumber: string; customerName: string; amount: string; url: string }) => ({
    subject: `Invoice ${p.invoiceNumber} is overdue`,
    ...layout({
      preheader: `${p.customerName} · ${p.amount}`,
      heading: 'An invoice is overdue',
      paragraphs: [`Invoice ${p.invoiceNumber} for ${p.customerName} (${p.amount}) has passed its due date.`],
      cta: { label: 'Follow up', url: p.url },
    }),
  }),

  trialEnding: (p: { name: string; daysLeft: number }) => ({
    subject: `Your free trial ends in ${p.daysLeft} day${p.daysLeft === 1 ? '' : 's'}`,
    ...layout({
      preheader: 'Choose a plan to keep your premium features.',
      heading: 'Your trial is ending soon',
      paragraphs: [
        `Hi ${p.name}, your ${APP_NAME} trial ends in ${p.daysLeft} day${p.daysLeft === 1 ? '' : 's'}.`,
        'Your data stays safe either way — upgrade to keep higher limits and premium features.',
      ],
      cta: { label: 'Choose a plan', url: appUrl('/billing') },
    }),
  }),

  subscriptionActivated: (p: { planName: string }) => ({
    subject: `Your ${p.planName} plan is active`,
    ...layout({
      preheader: 'Thanks for subscribing.',
      heading: `You're on ${p.planName}`,
      paragraphs: [`Your ${p.planName} subscription is active. Thank you for choosing ${APP_NAME}!`],
      cta: { label: 'View billing', url: appUrl('/billing') },
    }),
  }),

  subscriptionCanceled: (p: { planName: string; endsAt: string | null }) => ({
    subject: 'Your subscription was canceled',
    ...layout({
      preheader: 'We are sorry to see you go.',
      heading: 'Subscription canceled',
      paragraphs: [
        p.endsAt
          ? `Your ${p.planName} plan stays active until ${p.endsAt}. After that your workspace moves to the Free plan — your data is kept.`
          : `Your ${p.planName} plan was canceled. Your workspace is now on the Free plan — your data is kept.`,
      ],
      cta: { label: 'Reactivate', url: appUrl('/billing') },
    }),
  }),

  contactMessage: (p: { name: string; email: string; company: string | null; topic: string; message: string }) => ({
    subject: `[Contact] ${p.topic} — ${p.name}`,
    ...layout({
      preheader: `New message from ${p.email}`,
      heading: 'New contact form message',
      paragraphs: [`From: ${p.name} <${p.email}>${p.company ? ` · ${p.company}` : ''}`, `Topic: ${p.topic}`, p.message],
    }),
  }),

  paymentFailed: (p: { planName: string }) => ({
    subject: 'Payment failed for your subscription',
    ...layout({
      preheader: 'Please update your payment method.',
      heading: "We couldn't process your payment",
      paragraphs: [`The latest payment for your ${p.planName} plan failed. Please update your payment method to avoid interruption.`],
      cta: { label: 'Update billing', url: appUrl('/billing') },
    }),
  }),
}

export type EmailTemplateName = keyof typeof emailTemplates
