import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from "@/components/theme-provider"
import { Providers } from "@/components/providers"

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Archon - Autonomous Development Assistant',
  description: 'AI-powered software engineering agent',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Providers
          themeProps={{
            attribute: "class",
            defaultTheme: "system",
            enableSystem: true,
            storageKey: "archon-theme"
          }}
        >
          {children}
          <Toaster position="bottom-right" />
        </Providers>
      </body>
    </html>
  )
}
