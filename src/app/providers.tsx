'use client'
import { SessionProvider } from 'next-auth/react'
import { DialogProvider } from '@/components/ui/Dialog'
import { FeedbackProvider } from '@/components/providers/FeedbackProvider'
import { ThemeProvider } from '@/components/providers/ThemeProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SessionProvider>
        <DialogProvider>
          <FeedbackProvider>{children}</FeedbackProvider>
        </DialogProvider>
      </SessionProvider>
    </ThemeProvider>
  )
}
