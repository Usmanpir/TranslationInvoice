'use client'
import { SessionProvider } from 'next-auth/react'
import { DialogProvider } from '@/components/ui/Dialog'
import { FeedbackProvider } from '@/components/providers/FeedbackProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <DialogProvider>
        <FeedbackProvider>{children}</FeedbackProvider>
      </DialogProvider>
    </SessionProvider>
  )
}
