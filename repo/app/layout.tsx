import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import PrefetchClient from '@/components/PrefetchClient'
import PrefetchRoutesInjector from '@/components/PrefetchRoutesInjector'
import './globals.css'

export const metadata: Metadata = {
  title: 'Next.js Performance Optimization Demo',
  description: 'Large-scale web application prototype for performance research',
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <PrefetchRoutesInjector />
        <PrefetchClient />
        {children}
      </body>
    </html>
  )
}

