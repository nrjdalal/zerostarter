import { blog, consoleDocs, docs } from "collections/server"
import { loader } from "fumadocs-core/source"

export const docsSource = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
})

export const blogSource = loader({
  baseUrl: "/blog",
  source: blog.toFumadocsSource(),
})

// Served only under the access-protected /console area. Intentionally not referenced by any public route (search, sitemap, llms.txt, og).
export const consoleSource = loader({
  baseUrl: "/console/docs",
  source: consoleDocs.toFumadocsSource(),
})
