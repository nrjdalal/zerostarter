import { createFileRoute } from "@tanstack/react-router"

import { config } from "@/lib/config"

// Port of web/next's app/robots.ts; the text shape matches Next's MetadataRoute.Robots serialization.
export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () => {
        const baseUrl = config.app.url

        const body = `User-Agent: *
Allow: /
Disallow: /api/
Disallow: /console/
Disallow: /dashboard/

Sitemap: ${baseUrl}/sitemap.xml
`

        return new Response(body, {
          headers: { "Content-Type": "text/plain" },
        })
      },
    },
  },
})
