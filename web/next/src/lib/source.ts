import { blog, docs } from "collections/server"
import { loader } from "fumadocs-core/source"

export const docsSource = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
})

export const blogSource = loader({
  baseUrl: "/blog",
  source: blog.toFumadocsSource(),
})
