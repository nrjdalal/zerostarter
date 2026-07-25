import { site } from "@packages/config/site"

import { getPublishedBlogPosts } from "@/lib/blog"
import { toBlogDate } from "@/lib/blog-policy"
import { config } from "@/lib/config"
import { contentSource } from "@/lib/content"

export const dynamic = "force-static"
export const revalidate = 60

const blog = contentSource("blog")

// Minimal XML escaping: titles and descriptions are author-written prose, so only the five predefined entities can appear.
function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
}

// Companion to sitemap.ts and llms.txt: the same published-post gate, rendered as RSS 2.0 for feed readers. Empty channel when the blog feature is off, so a fork that disables the blog still serves a valid feed rather than a 404.
export async function GET() {
  const baseUrl = config.app.url
  const posts = blog.enabled ? getPublishedBlogPosts() : []

  const items = posts
    .map((page) => {
      const published = toBlogDate(page.data.publishedAt)
      const description = page.data.description ?? ""
      return [
        "    <item>",
        `      <title>${escapeXml(page.data.title)}</title>`,
        `      <link>${baseUrl}${page.url}</link>`,
        `      <guid isPermaLink="true">${baseUrl}${page.url}</guid>`,
        `      <pubDate>${published.toUTCString()}</pubDate>`,
        description ? `      <description>${escapeXml(description)}</description>` : "",
        page.data.author ? `      <author>${escapeXml(page.data.author)}</author>` : "",
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n")
    })
    .join("\n")

  const latest = posts.length > 0 ? toBlogDate(posts[0].data.publishedAt) : new Date()

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(site.name)}</title>
    <link>${baseUrl}/blog</link>
    <description>${escapeXml(site.description)}</description>
    <language>en</language>
    <lastBuildDate>${latest.toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  })
}
