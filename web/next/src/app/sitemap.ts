import { MetadataRoute } from "next"

import { getPublishedBlogPosts } from "@/lib/blog"
import { config } from "@/lib/config"
import { docsSource } from "@/lib/source"

export const dynamic = "force-static"
export const revalidate = 60

function toSitemapDate(value: string): Date {
  return new Date(value.includes("T") ? value : `${value}T00:00:00.000Z`)
}

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

  // Docs pages
  const docsPages = docsSource.getPages()
  const docsRoutes: MetadataRoute.Sitemap = docsPages.map((page) => ({
    url: `${baseUrl}${page.url}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }))

  // Blog pages
  const blogPages = getPublishedBlogPosts()
  const blogRoutes: MetadataRoute.Sitemap = blogPages.map((page) => ({
    url: `${baseUrl}${page.url}`,
    lastModified: toSitemapDate(
      page.data.updatedAt ?? page.data.publishedAt ?? page.data.createdAt,
    ),
    changeFrequency: "monthly" as const,
    priority: 0.9,
  }))

  // Combine all pages and sort
  const allPages = [...staticRoutes, ...docsRoutes, ...blogRoutes]
  return allPages.sort((a, b) => a.url.localeCompare(b.url))
}
