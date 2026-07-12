import type { Folder, Node, Root } from "fumadocs-core/page-tree"

import {
  compareBlogPostPublishOrder,
  isBlogPostPublished,
  type BlogPostMeta,
} from "@/lib/blog-policy"
import { blogSource } from "@/lib/source"

type BlogPage = NonNullable<ReturnType<typeof blogSource.getPage>>
type PublishedBlogPage = BlogPage & {
  data: BlogPage["data"] & { publishedAt: string }
}

// Naming: "public" includes the /blog index plus published posts (routes, params, page tree); "published" is posts only, excluding the index (listings, sitemap, llms).
export function isBlogIndexPage(page: BlogPage): boolean {
  return page.url === "/blog"
}

function isPublishedBlogPost(page: BlogPage, now = new Date()): page is PublishedBlogPage {
  return !isBlogIndexPage(page) && isBlogPostPublished(page.data, now)
}

// The /blog index plus published posts; the publish gate contentSource("blog") applies.
export function isPublicBlogPage(page: BlogPage, now = new Date()): boolean {
  return isBlogIndexPage(page) || isPublishedBlogPost(page, now)
}

function toBlogPostMeta(page: BlogPage): BlogPostMeta {
  return {
    slug: page.slugs.join("/"),
    createdAt: page.data.createdAt,
    draft: page.data.draft,
    publishedAt: page.data.publishedAt,
  }
}

function compareBlogPosts(a: BlogPage, b: BlogPage): number {
  return compareBlogPostPublishOrder(toBlogPostMeta(a), toBlogPostMeta(b))
}

export function getPublishedBlogPosts(now = new Date()): PublishedBlogPage[] {
  return blogSource
    .getPages()
    .filter((page) => isPublishedBlogPost(page, now))
    .sort(compareBlogPosts)
}

export function generatePublicBlogParams(now = new Date()) {
  return blogSource.generateParams().filter((params) => {
    const page = blogSource.getPage(params.slug)
    return page ? isPublicBlogPage(page, now) : false
  })
}

function filterPublishedBlogNode(node: Node, publishedUrls: Set<string>): Node | null {
  if (node.type === "page") return publishedUrls.has(node.url) ? node : null
  if (node.type !== "folder") return node

  const children = node.children.flatMap((child) => {
    const filtered = filterPublishedBlogNode(child, publishedUrls)
    return filtered ? [filtered] : []
  })
  const index = node.index && publishedUrls.has(node.index.url) ? node.index : undefined

  if (!index && children.length === 0) return null
  if (index) return { ...node, children, index }

  const { index: _index, ...folder } = node
  return { ...folder, children } satisfies Folder
}

export function getPublicBlogPageTree(now = new Date()): Root {
  const tree = blogSource.getPageTree()
  const publishedUrls = new Set(
    blogSource
      .getPages()
      .filter((page) => isPublicBlogPage(page, now))
      .map((page) => page.url),
  )

  return {
    ...tree,
    children: tree.children.flatMap((child) => {
      const filtered = filterPublishedBlogNode(child, publishedUrls)
      return filtered ? [filtered] : []
    }),
    fallback: undefined,
  }
}
