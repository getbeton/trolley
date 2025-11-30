import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"

import { TRPCProvider } from "./providers/trpc-provider"
import { Footer } from "@/components/footer"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Beton Migration Wizard",
  description: "Guide operators through Twenty → Attio migrations",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased flex min-h-screen flex-col`}>
        <TRPCProvider>
          <main className="flex-1">{children}</main>
          <Footer />
        </TRPCProvider>
      </body>
    </html>
  )
}
