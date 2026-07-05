import { createFileRoute } from "@tanstack/react-router"
import { createFromSource } from "fumadocs-core/search/server"

import { getConsoleSession } from "@/lib/auth/console"
import { consoleSource } from "@/lib/source"

// Gated console docs search: 404 for anyone without console access so the index never leaks.
const server = createFromSource(consoleSource, {
  // https://docs.orama.com/docs/orama-js/supported-languages
  language: "english",
})

export const Route = createFileRoute("/api/console/search")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!(await getConsoleSession())) {
          return new Response(null, { status: 404 })
        }
        return server.GET(request)
      },
    },
  },
})
