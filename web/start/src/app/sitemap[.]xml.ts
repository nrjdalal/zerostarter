import { createFileRoute } from "@tanstack/react-router"

import { getPublishedBlogPosts } from "@/lib/blog"
import { toBlogDate } from "@/lib/blog-policy"
import { config } from "@/lib/config"
import { docsSource } from "@/lib/source"

interface SitemapEntry {
  url: string
  lastModified: Date
  changeFrequency: "weekly" | "monthly"
  priority: number
}

const xmlEscape = (value: string) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")

// Port of web/next's app/sitemap.ts; the XML shape matches Next's MetadataRoute.Sitemap serialization.
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () => {
        const baseUrl = config.app.url

        const staticRoutes: SitemapEntry[] = [
          {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: "weekly" as const,
            priority: 1,
          },
        ]

        const docsRoutes: SitemapEntry[] = docsSource.getPages().map((page) => ({
          url: `${baseUrl}${page.url}`,
          lastModified: new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.9,
        }))

        const blogRoutes: SitemapEntry[] = getPublishedBlogPosts().map((page) => ({
          url: `${baseUrl}${page.url}`,
          lastModified: toBlogDate(page.data.updatedAt ?? page.data.publishedAt),
          changeFrequency: "monthly" as const,
          priority: 0.9,
        }))

        const allPages = [...staticRoutes, ...docsRoutes, ...blogRoutes].sort((a, b) =>
          a.url.localeCompare(b.url),
        )

        const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages
  .map(
    (entry) => `<url>
<loc>${xmlEscape(entry.url)}</loc>
<lastmod>${entry.lastModified.toISOString()}</lastmod>
<changefreq>${entry.changeFrequency}</changefreq>
<priority>${entry.priority}</priority>
</url>`,
  )
  .join("\n")}
</urlset>
`

        return new Response(body, {
          headers: { "Content-Type": "application/xml" },
        })
      },
    },
  },
})
