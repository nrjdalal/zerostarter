import { notFound } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"

import { getPublicBlogPage, getPublicBlogPageTree, getPublishedBlogPosts } from "@/lib/blog"
import { toPageInfo, type PageInfo, type PostSummary } from "@/lib/fumadocs"
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
    const info = toPageInfo(page, { blog: true })
    // The index renders <BlogPostList />; ship the published posts as serializable data for the client MDX render.
    if (page.url === "/blog") {
      const posts: PostSummary[] = getPublishedBlogPosts().map((post) => ({
        url: post.url,
        title: post.data.title,
        description: post.data.description,
        publishedAt: post.data.publishedAt,
      }))
      return { ...info, posts }
    }
    return info
  })
