import { MetadataRoute } from "next"

import { getPublishedBlogPosts } from "@/lib/blog"
import { toBlogDate } from "@/lib/blog-policy"
import { config } from "@/lib/config"
import { contentSource } from "@/lib/content"

export const dynamic = "force-static"
export const revalidate = 60

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = config.app.url

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 1,
    },
  ]

  // Docs pages (empty when the docs feature is off)
  const docsRoutes: MetadataRoute.Sitemap = contentSource("docs")
    .pages()
    .map((page) => ({
      url: `${baseUrl}${page.url}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    }))

  // Blog pages (empty when the blog feature is off)
  const blogRoutes: MetadataRoute.Sitemap = contentSource("blog").enabled
    ? getPublishedBlogPosts().map((page) => ({
        url: `${baseUrl}${page.url}`,
        lastModified: toBlogDate(page.data.updatedAt ?? page.data.publishedAt),
        changeFrequency: "monthly" as const,
        priority: 0.9,
      }))
    : []

  // Combine all pages and sort
  const allPages = [...staticRoutes, ...docsRoutes, ...blogRoutes]
  return allPages.sort((a, b) => a.url.localeCompare(b.url))
}
