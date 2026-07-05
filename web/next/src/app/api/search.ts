import { createFileRoute } from "@tanstack/react-router"
import { createFromSource } from "fumadocs-core/search/server"

import { docsSource } from "@/lib/source"

const server = createFromSource(docsSource, {
  // https://docs.orama.com/docs/orama-js/supported-languages
  language: "english",
})

export const Route = createFileRoute("/api/search")({
  server: {
    handlers: {
      GET: async ({ request }) => server.GET(request),
    },
  },
})
