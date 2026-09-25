import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { rateLimit } from './server/rate-limit'

const GENERIC_LOGIN_ERROR = 'Invalid email or password'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        const email = credentials?.email?.trim().toLowerCase()
        const password = credentials?.password
        if (!email || !password) throw new Error(GENERIC_LOGIN_ERROR)

        // Throttle brute-force attempts per email and per IP.
        const fwd = (req?.headers?.['x-forwarded-for'] as string | undefined) ?? ''
        const ip = fwd.split(',')[0]?.trim() || 'unknown'
        const [byEmail, byIp] = await Promise.all([
          rateLimit(`login:email:${email}`, 10, 15 * 60),
          rateLimit(`login:ip:${ip}`, 50, 15 * 60),
        ])
        if (!byEmail.allowed || !byIp.allowed) {
          throw new Error('Too many sign-in attempts. Please try again in a few minutes.')
        }

        const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } })
        // Same message for unknown email and wrong password (no account enumeration).
        if (!user) throw new Error(GENERIC_LOGIN_ERROR)

        const valid = await bcrypt.compare(password, user.password)
        if (!valid) throw new Error(GENERIC_LOGIN_ERROR)

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          isSuperAdmin: user.isSuperAdmin,
          tokenVersion: user.tokenVersion,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.isSuperAdmin = Boolean((user as any).isSuperAdmin)
        token.tokenVersion = Number((user as any).tokenVersion ?? 0)
      }
      // Client-side `update({ name })` after editing the profile.
      if (trigger === 'update' && session?.name && typeof session.name === 'string') {
        token.name = session.name.slice(0, 120)
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.isSuperAdmin = Boolean(token.isSuperAdmin)
        session.user.tokenVersion = Number(token.tokenVersion ?? 0)
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
