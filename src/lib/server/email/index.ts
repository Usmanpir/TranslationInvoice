import 'server-only'
import { getEmailProvider } from './provider'
import { emailTemplates, type EmailTemplateName } from './templates'

export { appUrl } from './templates'

type TemplateParams<N extends EmailTemplateName> = Parameters<(typeof emailTemplates)[N]>[0]

/** Renders and sends a transactional email. Failures are logged, never thrown to the caller. */
export async function sendEmail<N extends EmailTemplateName>(to: string | string[], template: N, params: TemplateParams<N>) {
  try {
    const render = emailTemplates[template] as (p: TemplateParams<N>) => { subject: string; html: string; text: string }
    const message = render(params)
    return await getEmailProvider().send({ to, ...message })
  } catch (error) {
    console.error(`[email] failed to send "${template}"`, error)
    return null
  }
}
