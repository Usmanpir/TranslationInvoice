import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      companyName?: string
    } & DefaultSession['user']
  }
}
