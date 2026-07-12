import { createFromSource } from "fumadocs-core/search/server"

import { contentSource } from "@/lib/content"

const docs = contentSource("docs")

const search = createFromSource(docs.source, {
  // https://docs.orama.com/docs/orama-js/supported-languages
  language: "english",
})

export async function GET(request: Request) {
  if (!docs.enabled) return new Response(null, { status: 404 })
  return search.GET(request)
}
