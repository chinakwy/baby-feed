'use client'

import type { Session } from 'next-auth'
import { SessionProvider } from 'next-auth/react'
import Navbar from './Navbar'
import { ThemeProvider } from './ThemeProvider'
import type { ThemeColor } from '@/lib/themes'
import { CopyToastProvider } from './CopyToast'
import { RecordComposerProvider } from './RecordComposerProvider'

export function Providers({
  children,
  session,
  initialTheme,
}: {
  children: React.ReactNode
  session: Session | null
  initialTheme?: ThemeColor
}) {
  return (
    <SessionProvider session={session}>
      <ThemeProvider initialTheme={initialTheme}>
      <CopyToastProvider>
        <RecordComposerProvider>
          <Navbar />
          <main className="min-h-screen bg-background pb-safe-tabbar md:pb-0">
            {children}
          </main>
        </RecordComposerProvider>
      </CopyToastProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
