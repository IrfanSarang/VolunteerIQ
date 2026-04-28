// frontend/src/app/layout.tsx
import type { Metadata } from 'next'
import { AuthProvider } from '../context/AuthContext'

// Keep your existing Google Material Symbols import below:
import './globals.css' // or wherever your global styles are

export const metadata: Metadata = {
  title: 'Your App Name',
  description: 'Your app description',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Google Material Symbols — keep your existing link tag here */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined"
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