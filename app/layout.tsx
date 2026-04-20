import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"

export const metadata: Metadata = {
  title: "CNE - Sistema de Gestión",
  description: "Sistema de Gestión de Personal Electoral",
  icons: {
    icon: "/images/CNE_Ecuador.webp",
    shortcut: "/images/CNE_Ecuador.webp",
    apple: "/images/CNE_Ecuador.webp",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/images/CNE_Ecuador.webp" type="image/webp" />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
