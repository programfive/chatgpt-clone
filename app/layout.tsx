import { type Metadata } from 'next'
import {
  ClerkProvider,
} from '@clerk/nextjs'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import UserSync from './components/UserSync'
import { ToastProvider } from './components/ToastProvider'
import { esES } from '@clerk/localizations';
import AppShell from './components/AppShell'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: {
    default: 'ChatGPT',
    template: '%s | ChatGPT',
  },
  description: 'Chat con IA, soporte de archivos y chats de grupo.',
  applicationName: 'ChatGPT',
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/logo.svg',
    shortcut: '/logo.svg',
    apple: '/logo.svg',
  },
  openGraph: {
    type: 'website',
    title: 'ChatGPT',
    description: 'Chat con IA, soporte de archivos y chats de grupo.',
    siteName: 'ChatGPT',
  },
  twitter: {
    card: 'summary',
    title: 'ChatGPT',
    description: 'Chat con IA, soporte de archivos y chats de grupo.',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider localization={esES}>
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          <ToastProvider>
            <UserSync />
            <AppShell>{children}</AppShell>
          </ToastProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}