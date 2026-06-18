import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page"
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared"
import { createRelativeLink } from "fumadocs-ui/mdx"
import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { CopyAsMarkdown } from "@/components/copy-as-markdown"
import { formatBlogDate, toBlogDate } from "@/lib/blog-policy"
import { config } from "@/lib/config"
import { blogSource, consoleSource, docsSource } from "@/lib/source"
import { getMDXComponents } from "@/mdx-components"

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: config.app.name,
    },
  }
}

type Source = typeof blogSource | typeof docsSource | typeof consoleSource
type Page<S extends Source> = Parameters<S["resolveHref"]>[1]

interface PageData<S extends Source> {
  page: Page<S>
  source: S
}

type AnyPageData =
  | PageData<typeof docsSource>
  | PageData<typeof blogSource>
  | PageData<typeof consoleSource>

export async function getPageData<S extends Source>(
  params: Promise<{ slug?: string[] }>,
  source: S,
): Promise<PageData<S>> {
  const resolvedParams = await params
  const page = source.getPage(resolvedParams.slug)
  if (!page) notFound()
  return { page: page as Page<S>, source }
}

function createPageRelativeLink(data: AnyPageData): ReturnType<typeof createRelativeLink> {
  if (data.source === blogSource) {
    return createRelativeLink(blogSource, data.page as Page<typeof blogSource>)
  }
  if (data.source === consoleSource) {
    return createRelativeLink(consoleSource, data.page as Page<typeof consoleSource>)
  }
  return createRelativeLink(docsSource, data.page as Page<typeof docsSource>)
}

function getBlogArticleDates(data: AnyPageData) {
  if (data.source !== blogSource || data.page.url === "/blog") return null

  const page = data.page as Page<typeof blogSource>
  if (!page.data.publishedAt) return null

  return {
    publishedAt: page.data.publishedAt,
    updatedAt: page.data.updatedAt,
  }
}

export function renderPageContent(data: AnyPageData) {
  const { page } = data
  const MDX = page.data.body
  const isDocsPage = page.url.startsWith("/docs")
  const isBlogMainPage = page.url === "/blog"
  const blogArticleDates = getBlogArticleDates(data)

  return (
    <DocsPage
      toc={isBlogMainPage ? undefined : page.data.toc}
      full={page.data.full}
      footer={isBlogMainPage ? { enabled: false } : undefined}
    >
      <DocsTitle>
        {page.data.title} {isDocsPage && <CopyAsMarkdown url={page.url} />}
      </DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            a: createPageRelativeLink(data),
          })}
        />
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

export function createGenerateStaticParams(source: Source) {
  return async function generateStaticParams() {
    return source.generateParams()
  }
}

interface GenerateMetadataOptions {
  source: Source
  ogPath: string
  ogType: "article" | "website"
}

export async function generatePageMetadata(
  params: Promise<{ slug?: string[] }>,
  options: GenerateMetadataOptions,
): Promise<Metadata> {
  const resolvedParams = await params
  const { source, ogPath, ogType } = options
  const page = source.getPage(resolvedParams.slug)
  if (!page) notFound()

  const pageUrl = `${config.app.url}${page.url}`
  const slugPath =
    resolvedParams.slug && resolvedParams.slug.length > 0 ? resolvedParams.slug.join("/") : ""
  // Intentional cache-bust: the build/revalidation timestamp ties the OG URL to each deploy so social and CDN scrapers refetch the regenerated image instead of serving a stale one; not a bug.
  const imageUrl = `${config.app.url}${ogPath}${slugPath ? `/${slugPath}` : ""}?t=${Date.now()}`
  const blogArticle =
    options.source === blogSource && page.url !== "/blog" ? (page as Page<typeof blogSource>) : null
  const publishedTime = blogArticle?.data.publishedAt
    ? toBlogDate(blogArticle.data.publishedAt).toISOString()
    : undefined
  const modifiedTime = blogArticle?.data.publishedAt
    ? toBlogDate(blogArticle.data.updatedAt ?? blogArticle.data.publishedAt).toISOString()
    : undefined
  const openGraph =
    ogType === "article"
      ? {
          type: "article" as const,
          title: page.data.title,
          description: page.data.description,
          siteName: config.app.name,
          url: pageUrl,
          images: [
            {
              url: imageUrl,
              width: 1200,
              height: 630,
              alt: page.data.title,
            },
          ],
          publishedTime,
          modifiedTime,
          authors: blogArticle?.data.author ? [blogArticle.data.author] : undefined,
          tags: blogArticle?.data.tags,
        }
      : {
          type: "website" as const,
          title: page.data.title,
          description: page.data.description,
          siteName: config.app.name,
          url: pageUrl,
          images: [
            {
              url: imageUrl,
              width: 1200,
              height: 630,
              alt: page.data.title,
            },
          ],
        }

  return {
    title: page.data.title,
    description: page.data.description,
    openGraph,
    other: {
      "og:logo": `${config.app.url}/favicon.ico`,
    },
    twitter: {
      card: "summary_large_image",
      images: [imageUrl],
    },
  }
}
