import { MetadataRoute } from "next"

// MVP phase: advertise no URLs while crawling and indexing are blocked (see
// robots.ts). Restore the commented implementation below when going public.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return []
}

// import { config } from "@/lib/config"
// import { blogSource, docsSource } from "@/lib/source"
//
// export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
//   const baseUrl = config.app.url
//
//   const staticRoutes: MetadataRoute.Sitemap = [
//     {
//       url: baseUrl,
//       lastModified: new Date(),
//       changeFrequency: "weekly" as const,
//       priority: 1,
//     },
//   ]
//
//   // Docs pages
//   const docsPages = docsSource.getPages()
//   const docsRoutes: MetadataRoute.Sitemap = docsPages.map((page) => ({
//     url: `${baseUrl}${page.url}`,
//     lastModified: new Date(),
//     changeFrequency: "weekly" as const,
//     priority: 0.9,
//   }))
//
//   // Blog pages
//   const blogPages = blogSource.getPages().filter((p) => p.url !== "/blog")
//   const blogRoutes: MetadataRoute.Sitemap = blogPages.map((page) => ({
//     url: `${baseUrl}${page.url}`,
//     lastModified: new Date(),
//     changeFrequency: "monthly" as const,
//     priority: 0.9,
//   }))
//
//   // Combine all pages and sort
//   const allPages = [...staticRoutes, ...docsRoutes, ...blogRoutes]
//   return allPages.sort((a, b) => a.url.localeCompare(b.url))
// }
