import { site } from "@packages/config/site"
import { createFileRoute } from "@tanstack/react-router"

import { getPublicBlogPage } from "@/lib/blog"
import { generateOgImage } from "@/lib/og-image"
import { blogSource } from "@/lib/source"

export const Route = createFileRoute("/og/blog/$")({
  server: {
    handlers: {
      GET: ({ params }) => {
        const slug = params._splat?.split("/") ?? []
        // Unpublished or unknown posts get no OG card (mirrors the Next.js app's public gate); the thrown notFound maps to a plain 404 in this raw handler.
        try {
          void getPublicBlogPage(slug)
        } catch {
          return new Response("Not Found", { status: 404 })
        }

        return generateOgImage(slug, {
          source: blogSource,
          sectionName: "Blog",
          defaultTitle: `${site.name} - Blog`,
          defaultDescription: `Blog post from ${site.name}`,
        })
      },
    },
  },
})
