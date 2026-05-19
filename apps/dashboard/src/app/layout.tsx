import type { Metadata, Viewport } from 'next'
import '@/styles/globals.css'
import AppShellClient from '@/components/layout/AppShellClient'

export const metadata: Metadata = {
  title: 'Agentic OS',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShellClient>{children}</AppShellClient>
      </body>
    </html>
  )
}
