import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Finnish Exam Generator',
  description: 'AI-powered Finnish exam question generator using Gemini 2.5 Flash-Lite',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="min-h-screen bg-background text-foreground">
          <header className="border-b border-gray-200 dark:border-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-6">
                <h1 className="text-2xl font-bold">Finnish Exam Generator</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  AI-Powered Question Generation
                </p>
              </div>
            </div>
          </header>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}