import { site } from "@packages/config/site"
import { createFileRoute } from "@tanstack/react-router"

import { generateOgImage } from "@/lib/og-image"
import { blogSource } from "@/lib/source"

export const Route = createFileRoute("/og/blog/")({
  server: {
    handlers: {
      GET: () =>
        generateOgImage(undefined, {
          source: blogSource,
          sectionName: "Blog",
          defaultTitle: `${site.name} - Blog`,
          defaultDescription: `Blog post from ${site.name}`,
        }),
    },
  },
})
