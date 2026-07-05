import { site } from "@packages/config/site"
import { createFileRoute } from "@tanstack/react-router"

import { renderOgImage } from "@/lib/og-image"

export const Route = createFileRoute("/og/")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const { searchParams } = new URL(request.url)

        return renderOgImage({
          sectionName: searchParams.get("section")?.slice(0, 100) || undefined,
          title: searchParams.get("title")?.slice(0, 100) || site.tagline,
          description: searchParams.get("description")?.slice(0, 200) || site.description,
        })
      },
    },
  },
})
