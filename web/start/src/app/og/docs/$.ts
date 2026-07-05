import { site } from "@packages/config/site"
import { createFileRoute } from "@tanstack/react-router"

import { generateOgImage } from "@/lib/og-image"
import { docsSource } from "@/lib/source"

export const Route = createFileRoute("/og/docs/$")({
  server: {
    handlers: {
      GET: ({ params }) =>
        generateOgImage(params._splat?.split("/") ?? [], {
          source: docsSource,
          sectionName: "Documentation",
          defaultTitle: `${site.name} - Documentation`,
          defaultDescription: `Documentation for ${site.name}`,
        }),
    },
  },
})
