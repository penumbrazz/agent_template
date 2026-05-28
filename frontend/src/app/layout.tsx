import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import './globals.css'
import TelemetryInit from '@/components/TelemetryInit'

export const metadata: Metadata = {
  title: 'Agent Template',
  description: 'Full-stack AI application template.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="bg-base text-text-primary antialiased">
        <TelemetryInit />
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}
