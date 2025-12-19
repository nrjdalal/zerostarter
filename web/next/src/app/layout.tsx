import type { Metadata } from "next"

import { config } from "@/lib/config"
import { Navbar } from "@/components/navbar/home"
import { InnerProvider, OuterProvider } from "@/app/providers"

import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: `${config.app.name} - ${config.app.tagline}`,
    template: `%s | ${config.app.name}`,
  },
  description: config.app.description,
  openGraph: {
    type: "website",
    url: config.app.url,
    siteName: config.app.name,
    images: [
      {
        url: `${config.app.url}/api/og?type=home`,
        width: 1200,
        height: 630,
        alt: `${config.app.name} - ${config.app.tagline}`,
      },
    ],
  },
  other: {
    "og:logo": `${config.app.url}/favicon.ico`,
  },
  twitter: {
    card: "summary_large_image",
    images: [`${config.app.url}/api/og?type=home`],
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
