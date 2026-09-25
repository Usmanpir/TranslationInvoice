import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      /** Display hint only — the server always re-checks the database. */
      isSuperAdmin: boolean
      tokenVersion: number
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    isSuperAdmin?: boolean
    tokenVersion?: number
  }
}
