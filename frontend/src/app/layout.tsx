import type { Metadata } from 'next'
import { AuthProvider } from '../context/AuthContext'
import './globals.css'

export const metadata: Metadata = {
  title: 'VolunteerIQ — Crisis Response Coordination',
  description: 'AI-powered volunteer coordination platform for rapid crisis response.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}