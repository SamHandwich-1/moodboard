import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Moodboard Engine — Visual Word Harvester',
  description: 'Generate mood images, describe them, harvest naming vocabulary',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
