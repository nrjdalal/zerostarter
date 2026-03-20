import { existsSync } from "node:fs"
import { join } from "node:path"

import caveatUrl from "@fontsource-variable/caveat/files/caveat-latin-wght-normal.woff2"
import dmSansUrl from "@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2"
import jetbrainsMonoUrl from "@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2"
import newsreaderUrl from "@fontsource-variable/newsreader/files/newsreader-latin-wght-normal.woff2"
import type { Metadata } from "next"

import { InnerProvider, OuterProvider } from "@/app/providers"
import { Navbar } from "@/components/navbar/home"
import { config } from "@/lib/config"

import "@/app/globals.css"

function getOgImageUrl(): string {
  const staticOgPath = join(process.cwd(), "public", "og", "home.png")
  if (existsSync(staticOgPath)) {
    return `${config.app.url}/og/home.png?t=${Date.now()}`
  }
  return `${config.app.url}/api/og/home?t=${Date.now()}`
}

const ogImageUrl = getOgImageUrl()

export const metadata: Metadata = {
  title: {
    default: `${config.app.name} - ${config.app.tagline}`,
    template: `%s | ${config.app.name}`,
  },
  description: config.app.description,
  openGraph: {
    type: "website",
    siteName: config.app.name,
    url: config.app.url,
    images: [
      {
        url: ogImageUrl,
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
    images: [ogImageUrl],
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
        <head>
          <link
            rel="preload"
            href={dmSansUrl}
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />
          <link
            rel="preload"
            href={caveatUrl}
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />
          <link
            rel="preload"
            href={newsreaderUrl}
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />
          <link
            rel="preload"
            href={jetbrainsMonoUrl}
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />
        </head>
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
