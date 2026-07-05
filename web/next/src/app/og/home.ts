import { site } from "@packages/config/site"
import { createFileRoute } from "@tanstack/react-router"

import { renderOgImage } from "@/lib/og-image"

export const Route = createFileRoute("/og/home")({
  server: {
    handlers: {
      GET: () =>
        renderOgImage({
          title: site.tagline,
          description: site.description,
        }),
    },
  },
})
