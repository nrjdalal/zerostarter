import { loader } from "fumadocs-core/source"
import { blog, docs } from "fumadocs-mdx:collections/server"

export const docsSource = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
})

export const blogSource = loader({
  baseUrl: "/blog",
  source: blog.toFumadocsSource(),
})
