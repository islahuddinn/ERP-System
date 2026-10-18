import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { Providers } from './providers'

// Self-hosted Inter (next/font/local) — avoids a build-time fetch to Google Fonts,
// which the container build environment can't reach.
const inter = localFont({
  src: './fonts/Inter-latin.woff2',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Malind Tech - Inventory Management System',
  description: 'Complete Stock Management System',
  // Next.js 13+ automatically uses icon.png/icon.svg in app directory
  // If you want to use a custom path, uncomment below:
  // icons: {
  //   icon: '/favicon.png',
  //   shortcut: '/favicon.png',
  //   apple: '/favicon.png',
  // },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
