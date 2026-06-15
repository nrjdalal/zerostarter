import { createFromSource } from "fumadocs-core/search/server"

import { getConsoleSession } from "@/lib/auth/console"
import { consoleSource } from "@/lib/source"

// Gated console docs search: 404 for anyone without console access so the index never leaks; never statically cached.
export const dynamic = "force-dynamic"

const search = createFromSource(consoleSource, {
  // https://docs.orama.com/docs/orama-js/supported-languages
  language: "english",
})

export async function GET(request: Request) {
  if (!(await getConsoleSession())) {
    return new Response(null, { status: 404 })
  }
  return search.GET(request)
}
