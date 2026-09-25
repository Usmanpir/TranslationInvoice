// next-auth calls `new URL(process.env.NEXTAUTH_URL)` on load and only falls back to its
// default when the variable is undefined, so an empty value ("") crashes the build with
// "TypeError: Invalid URL". Treat blank values as unset.
for (const key of ['NEXTAUTH_URL', 'NEXTAUTH_URL_INTERNAL']) {
  if (process.env[key] !== undefined && process.env[key].trim() === '') {
    delete process.env[key]
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
}

module.exports = nextConfig
