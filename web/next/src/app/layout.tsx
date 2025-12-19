import type { Metadata } from "next"

import { env } from "@packages/env/web-next"

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
    url: env.NEXT_PUBLIC_APP_URL,
    siteName: "ZeroStarter",
    images: [
      {
        url: `${env.NEXT_PUBLIC_APP_URL}/api/og?type=home`,
        width: 1200,
        height: 630,
        alt: "ZeroStarter - The SaaS Starter",
      },
    ],
  },
  other: {
    "og:logo": `${env.NEXT_PUBLIC_APP_URL}/favicon.ico`,
  },
  twitter: {
    card: "summary_large_image",
    images: [`${env.NEXT_PUBLIC_APP_URL}/api/og?type=home`],
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
