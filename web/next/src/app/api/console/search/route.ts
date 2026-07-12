import { createFromSource } from "fumadocs-core/search/server"

import { getConsoleSession } from "@/lib/auth/console"
import { contentSource } from "@/lib/content"

// Gated console docs search: 404 for anyone without console access so the index never leaks; never statically cached.
export const dynamic = "force-dynamic"

const consoleDocs = contentSource("console")

const search = createFromSource(consoleDocs.source, {
  // https://docs.orama.com/docs/orama-js/supported-languages
  language: "english",
})

export async function GET(request: Request) {
  if (!consoleDocs.enabled || !(await getConsoleSession())) {
    return new Response(null, { status: 404 })
  }
  return search.GET(request)
}
