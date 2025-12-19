import type { Metadata } from "next"

import { Navbar } from "@/components/navbar/home"
import { InnerProvider, OuterProvider } from "@/app/providers"

import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: "ZeroStarter - The SaaS Starter",
    template: "%s | ZeroStarter",
  },
  description:
    "A modern, type-safe, and high-performance SaaS starter template built with a monorepo architecture.",
  openGraph: {
    type: "website",
    siteName: "ZeroStarter",
    images: [
      {
        url: "/api/og?type=home",
        width: 1200,
        height: 630,
        alt: "ZeroStarter - The SaaS Starter",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/api/og?type=home"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <OuterProvider>
      <html lang="en" suppressHydrationWarning>
        <body className="min-h-dvh antialiased">
          <InnerProvider>
            <Navbar />
            {children}
          </InnerProvider>
        </body>
      </html>
    </OuterProvider>
  )
}
