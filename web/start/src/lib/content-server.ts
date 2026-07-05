import { notFound } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"

import { getPublicBlogPage, getPublicBlogPageTree } from "@/lib/blog"
import { toPageInfo, type PageInfo } from "@/lib/fumadocs"
import { blogSource, docsSource } from "@/lib/source"

// Server functions shared by the docs/blog index and splat routes; the sources (collections/server) stay server-only.

export const getDocsTree = createServerFn({ method: "GET" }).handler(() =>
  docsSource.serializePageTree(docsSource.getPageTree()),
)

export const getDocsPage = createServerFn({ method: "GET" })
  .validator((slugs: string[]) => slugs)
  .handler(({ data: slugs }): PageInfo => {
    const page = docsSource.getPage(slugs)
    if (!page) throw notFound()
    return toPageInfo(page)
  })

export const getBlogTree = createServerFn({ method: "GET" }).handler(() =>
  blogSource.serializePageTree(getPublicBlogPageTree()),
)

export const getBlogPage = createServerFn({ method: "GET" })
  .validator((slugs: string[]) => slugs)
  .handler(({ data: slugs }): PageInfo => {
    const page = getPublicBlogPage(slugs.length ? slugs : undefined)
    return toPageInfo(page, { blog: true })
  })
