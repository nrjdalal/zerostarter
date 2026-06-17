import {
  compareBlogPublications,
  isPublishedBlogPublication,
  todayIsoDate,
} from "@/lib/blog-policy"
import { blogSource } from "@/lib/source"

type BlogPage = NonNullable<ReturnType<typeof blogSource.getPage>>

export function isBlogIndexPage(page: BlogPage): boolean {
  return page.url === "/blog"
}

export function isPublishedBlogPost(page: BlogPage, today = todayIsoDate()): boolean {
  return !isBlogIndexPage(page) && isPublishedBlogPublication(page.data, today)
}

export function isPublishedBlogPage(page: BlogPage, today = todayIsoDate()): boolean {
  return isBlogIndexPage(page) || isPublishedBlogPost(page, today)
}

export function compareBlogPosts(a: BlogPage, b: BlogPage): number {
  return compareBlogPublications(
    { slug: a.url, date: a.data.date, draft: a.data.draft },
    { slug: b.url, date: b.data.date, draft: b.data.draft },
  )
}

export function getPublishedBlogPosts(): BlogPage[] {
  const today = todayIsoDate()
  return blogSource
    .getPages()
    .filter((page) => isPublishedBlogPost(page, today))
    .sort(compareBlogPosts)
}

export function generatePublishedBlogParams() {
  const today = todayIsoDate()
  return blogSource.generateParams().filter((params) => {
    const page = blogSource.getPage(params.slug)
    return page ? isPublishedBlogPage(page, today) : false
  })
}
