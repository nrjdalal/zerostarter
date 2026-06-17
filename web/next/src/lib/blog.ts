import { blogSource } from "@/lib/source"

type BlogPage = NonNullable<ReturnType<typeof blogSource.getPage>>

const todayIsoDate = () => new Date().toISOString().slice(0, 10)

export function isBlogIndexPage(page: BlogPage): boolean {
  return page.url === "/blog"
}

export function isPublishedBlogPost(page: BlogPage, today = todayIsoDate()): boolean {
  return !isBlogIndexPage(page) && page.data.draft !== true && page.data.date <= today
}

export function isPublishedBlogPage(page: BlogPage, today = todayIsoDate()): boolean {
  return isBlogIndexPage(page) || isPublishedBlogPost(page, today)
}

export function compareBlogPosts(a: BlogPage, b: BlogPage): number {
  return b.data.date.localeCompare(a.data.date) || a.url.localeCompare(b.url)
}

export function getPublishedBlogPosts(): BlogPage[] {
  const today = todayIsoDate()
  return blogSource
    .getPages()
    .filter((page) => isPublishedBlogPost(page, today))
    .sort(compareBlogPosts)
}
