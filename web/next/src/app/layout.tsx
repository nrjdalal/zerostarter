import { existsSync } from "fs"
import { join } from "path"

import type { Metadata } from "next"
import Script from "next/script"

import { env } from "@packages/env/web-next"

import { config } from "@/lib/config"
import { Navbar } from "@/components/navbar/home"
import { InnerProvider, OuterProvider } from "@/app/providers"

import "./globals.css"

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
        <body className="min-h-dvh antialiased">
          <InnerProvider>
            <Navbar />
            {children}
            {process.env.NODE_ENV !== "development" && env.NEXT_PUBLIC_USERJOT_ID && (
              <>
                <Script
                  id="userjot-sdk"
                  strategy="afterInteractive"
                  dangerouslySetInnerHTML={{
                    __html: `window.$ujq=window.$ujq||[];window.uj=window.uj||new Proxy({},{get:(_,p)=>(...a)=>window.$ujq.push([p,...a])});document.head.appendChild(Object.assign(document.createElement('script'),{src:'https://cdn.userjot.com/sdk/v2/uj.js',type:'module',async:!0}));`,
                  }}
                />
                <Script
                  id="userjot-init"
                  strategy="afterInteractive"
                  dangerouslySetInnerHTML={{
                    __html: `window.uj.init('${env.NEXT_PUBLIC_USERJOT_ID}', { widget: true, position: 'right', theme: 'auto' });`,
                  }}
                />
              </>
            )}
          </InnerProvider>
        </body>
      </html>
    </OuterProvider>
  )
}
