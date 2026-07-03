import { existsSync } from "node:fs"
import { join } from "node:path"

import { site } from "@packages/config/site"
import type { Metadata } from "next"

import { InnerProvider, OuterProvider } from "@/app/providers"
import { Navbar } from "@/components/navbar/home"
import { config } from "@/lib/config"
import { dmSans, jetbrainsMono } from "@/lib/fonts"
import { cn } from "@/lib/utils"

import "@/app/globals.css"

// Intentional cache-bust (same rationale as generatePageMetadata): the timestamp ties the home OG URL to each deploy so scrapers refetch the regenerated image; not a bug.
function getOgImageUrl(): string {
  const staticOgPath = join(process.cwd(), "public", "og", "home.png")
  if (existsSync(staticOgPath)) {
    return `${config.app.url}/og/home.png?t=${Date.now()}`
  }
  return `${config.app.url}/og/home?t=${Date.now()}`
}

const ogImageUrl = getOgImageUrl()

export const metadata: Metadata = {
  title: {
    default: `${site.name} - ${site.tagline}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  openGraph: {
    type: "website",
    siteName: site.name,
    url: config.app.url,
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: `${site.name} - ${site.tagline}`,
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

// Resolve and apply the theme (class + color-scheme) in <head> before the body paints, mirroring next-themes so a dark-OS visitor never flashes the light background; next-themes' own script runs later, in the body.
const THEME_INIT = `try{var t=localStorage.getItem("theme");var d=t==="dark"||((t==="system"||!t)&&matchMedia("(prefers-color-scheme: dark)").matches);var e=document.documentElement;e.classList.remove("light","dark");e.classList.add(d?"dark":"light");e.style.colorScheme=d?"dark":"light"}catch(e){}`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <OuterProvider>
      <html
        className={cn(dmSans.variable, jetbrainsMono.variable, "antialiased")}
        lang="en"
        suppressHydrationWarning
      >
        <head>
          <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        </head>
        <body className="min-h-svh">
          <InnerProvider>
            <Navbar />
            {children}
          </InnerProvider>
        </body>
      </html>
    </OuterProvider>
  )
}
