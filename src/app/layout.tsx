import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ExamGenie',
  description: 'AI-powered exam question generator',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}