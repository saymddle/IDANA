import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/context/ThemeContext'
import Sidebar from '@/components/Sidebar'

export const metadata: Metadata = {
  title: 'IDANA — Culinary R&D',
  description: 'Your personal flavor intelligence system',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <main style={{ marginLeft: 72, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', overflow: 'hidden' }}>
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
