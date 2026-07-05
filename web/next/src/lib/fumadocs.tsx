import { site } from "@packages/config/site"
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page"
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared"
import type { MDXComponents } from "mdx/types"
import type { ComponentProps, ComponentType } from "react"

import { CopyAsMarkdown } from "@/components/copy-as-markdown"
import { formatBlogDate, toBlogDate } from "@/lib/blog-policy"
import { config } from "@/lib/config"
import { getMDXComponents } from "@/mdx-components"

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: site.name,
    },
  }
}

// Serializable summary of a published blog post, for the <BlogPostList /> MDX component. In the Next.js app that component read the server source directly (server component); in Start MDX renders on the client, so the list is passed down as data instead.
export interface PostSummary {
  url: string
  title: string
  description?: string
  publishedAt: string
}

// Serializable page payload a route loader builds server-side from a source page; the MDX body itself streams through the collections/browser client loaders (in the Vite runtime the compiled MDX module is loaded lazily on the client, unlike the Next.js app where page.data.body existed in the server component).
export interface PageInfo {
  path: string
  url: string
  title: string
  description?: string
  full?: boolean
  blog?: {
    publishedAt: string
    updatedAt?: string
    author?: string
    tags?: string[]
  } | null
  // Only set for the /blog index page, where <BlogPostList /> renders it.
  posts?: PostSummary[]
}

type SourcePage = {
  path: string
  url: string
  slugs: string[]
  data: {
    title: string
    description?: string
    full?: boolean
    publishedAt?: string
    updatedAt?: string
    author?: string
    tags?: string[]
  }
}

export function toPageInfo(page: SourcePage, { blog = false } = {}): PageInfo {
  const isBlogArticle = blog && page.url !== "/blog" && page.data.publishedAt
  return {
    path: page.path,
    url: page.url,
    title: page.data.title,
    description: page.data.description,
    full: page.data.full,
    blog: isBlogArticle
      ? {
          publishedAt: page.data.publishedAt as string,
          updatedAt: page.data.updatedAt,
          author: page.data.author,
          tags: page.data.tags,
        }
      : null,
  }
}

type Toc = ComponentProps<typeof DocsPage>["toc"]
type MDXBody = ComponentType<{ components?: MDXComponents }>

// Mirror of the Next.js app's renderPageContent, fed by the client loader instead of page.data.body. Relative-link resolution is dropped: the content uses absolute URLs only.
export function PageBody({ info, toc, MDX }: { info: PageInfo; toc: Toc; MDX: MDXBody }) {
  const isDocsPage = info.url.startsWith("/docs")
  const isBlogMainPage = info.url === "/blog"
  const blogArticleDates = info.blog

  return (
    <DocsPage
      toc={isBlogMainPage ? undefined : toc}
      full={info.full}
      footer={isBlogMainPage ? { enabled: false } : undefined}
    >
      <DocsTitle>
        {info.title} {isDocsPage && <CopyAsMarkdown url={info.url} />}
      </DocsTitle>
      <DocsDescription>{info.description}</DocsDescription>
      <DocsBody>
        <MDX components={getMDXComponents({ posts: info.posts })} />
      </DocsBody>
      {blogArticleDates && (
        <div className="not-prose text-muted-foreground mt-4 flex flex-wrap justify-end gap-x-3 gap-y-1 text-right text-sm">
          <time dateTime={blogArticleDates.publishedAt}>
            Published {formatBlogDate(blogArticleDates.publishedAt)}
          </time>
          {blogArticleDates.updatedAt &&
            blogArticleDates.updatedAt !== blogArticleDates.publishedAt && (
              <time dateTime={blogArticleDates.updatedAt}>
                Updated {formatBlogDate(blogArticleDates.updatedAt)}
              </time>
            )}
        </div>
      )}
    </DocsPage>
  )
}

interface PageHeadOptions {
  ogPath: string
  ogType: "article" | "website"
}

type MetaEntry = Record<string, string>

// Mirror of the Next.js app's generatePageMetadata as route head() meta entries, with the root title template ("%s | ZeroStarter") applied inline. Duplicate keys override the root head's defaults per HeadContent's dedupe.
export function pageHeadMeta(info: PageInfo, options: PageHeadOptions): MetaEntry[] {
  const { ogPath, ogType } = options
  const pageUrl = `${config.app.url}${info.url}`
  const slugPath = info.path ? info.url.split("/").slice(2).join("/") : ""
  // Intentional cache-bust: the timestamp ties the OG URL to each deploy so social and CDN scrapers refetch the regenerated image instead of serving a stale one; not a bug.
  const imageUrl = `${config.app.url}${ogPath}${slugPath ? `/${slugPath}` : ""}?t=${Date.now()}`
  const publishedTime = info.blog ? toBlogDate(info.blog.publishedAt).toISOString() : undefined
  const modifiedTime = info.blog
    ? toBlogDate(info.blog.updatedAt ?? info.blog.publishedAt).toISOString()
    : undefined

  const meta: MetaEntry[] = [
    { title: `${info.title} | ${site.name}` },
    ...(info.description ? [{ name: "description", content: info.description }] : []),
    { property: "og:type", content: ogType },
    { property: "og:title", content: info.title },
    ...(info.description ? [{ property: "og:description", content: info.description }] : []),
    { property: "og:site_name", content: site.name },
    { property: "og:url", content: pageUrl },
    { property: "og:image", content: imageUrl },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: info.title },
    { property: "og:logo", content: `${config.app.url}/favicon.ico` },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:image", content: imageUrl },
  ]

  if (ogType === "article" && info.blog) {
    if (publishedTime) meta.push({ property: "article:published_time", content: publishedTime })
    if (modifiedTime) meta.push({ property: "article:modified_time", content: modifiedTime })
    if (info.blog.author) meta.push({ property: "article:author", content: info.blog.author })
    for (const tag of info.blog.tags ?? []) {
      meta.push({ property: "article:tag", content: tag })
    }
  }

  return meta
}
