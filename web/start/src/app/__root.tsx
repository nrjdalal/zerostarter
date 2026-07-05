import { site } from "@packages/config/site"
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router"

import { InnerProvider, OuterProvider } from "@/app/providers"
import { config } from "@/lib/config"

import fontsCss from "@/app/fonts.css?url"
import globalsCss from "@/app/globals.css?url"

// Intentional cache-bust (same rationale as generatePageMetadata): the timestamp ties the home OG URL to each deploy so scrapers refetch the regenerated image; not a bug. web/next also probes for a prebuilt public/og/home.png, an asset this repo does not ship, so the dynamic route is the effective branch here.
const ogImageUrl = `${config.app.url}/og/home?t=${Date.now()}`

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: `${site.name} - ${site.tagline}` },
      { name: "description", content: site.description },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: site.name },
      { property: "og:url", content: config.app.url },
      { property: "og:image", content: ogImageUrl },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: `${site.name} - ${site.tagline}` },
      { property: "og:logo", content: `${config.app.url}/favicon.ico` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: ogImageUrl },
    ],
    links: [
      { rel: "icon", href: "/favicon.ico", sizes: "48x48" },
      { rel: "icon", href: "/icon.svg", type: "image/svg+xml" },
      { rel: "stylesheet", href: fontsCss },
      { rel: "stylesheet", href: globalsCss },
    ],
  }),
  component: RootLayout,
})

function RootLayout() {
  return (
    <OuterProvider>
      <html className="antialiased" lang="en" suppressHydrationWarning>
        <head>
          <HeadContent />
        </head>
        <body className="min-h-svh">
          <InnerProvider>
            <Outlet />
          </InnerProvider>
          <Scripts />
        </body>
      </html>
    </OuterProvider>
  )
}
