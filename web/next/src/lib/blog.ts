import type { Folder, Node, Root } from "fumadocs-core/page-tree"

import { compareBlogPostPublishOrder, isBlogPostPublished } from "@/lib/blog-policy"
import { blogSource } from "@/lib/source"

type BlogPage = NonNullable<ReturnType<typeof blogSource.getPage>>
type PublishedBlogPage = BlogPage & {
  data: BlogPage["data"] & { publishedAt: string }
}

export function isBlogIndexPage(page: BlogPage): boolean {
  return page.url === "/blog"
}

function isPublishedBlogPost(page: BlogPage, now = new Date()): page is PublishedBlogPage {
  return !isBlogIndexPage(page) && isBlogPostPublished(page.data, now)
}

export function isPublicBlogPage(page: BlogPage, now = new Date()): boolean {
  return isBlogIndexPage(page) || isPublishedBlogPost(page, now)
}

function compareBlogPosts(a: BlogPage, b: BlogPage): number {
  return compareBlogPostPublishOrder(
    {
      slug: a.slugs.join("/"),
      createdAt: a.data.createdAt,
      draft: a.data.draft,
      publishedAt: a.data.publishedAt,
    },
    {
      slug: b.slugs.join("/"),
      createdAt: b.data.createdAt,
      draft: b.data.draft,
      publishedAt: b.data.publishedAt,
    },
  )
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
