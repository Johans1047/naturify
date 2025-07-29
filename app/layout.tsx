import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { ThemeProvider } from "next-themes"
import ThemeToggle from "@/components/theme-toggle"

export const metadata: Metadata = {
  title: "LandscapeAI - Procesamiento Inteligente de Paisajes",
  description:
    "Plataforma serverless para corrección de color, generación automática de descripciones y clasificación semántica de fotografías de paisajes naturales",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body className="persona5-theme">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {children}
          <ThemeToggle />
        </ThemeProvider>
      </body>
    </html>
  )
}
