import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true, name: true, email: true, companyName: true, address: true,
      phone: true, taxNumber: true, bankName: true, bankBranch: true,
      bankAccountName: true, bankAccountNumber: true, iban: true,
      swiftCode: true, paypalEmail: true,
    },
  })
  return NextResponse.json(user)
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const {
    name, companyName, address, phone, taxNumber,
    bankName, bankBranch, bankAccountName, bankAccountNumber,
    iban, swiftCode, paypalEmail,
  } = body

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name, companyName, address, phone, taxNumber,
      bankName, bankBranch, bankAccountName, bankAccountNumber,
      iban, swiftCode, paypalEmail,
    },
    select: { id: true, name: true, email: true, companyName: true },
  })
  return NextResponse.json(user)
}
