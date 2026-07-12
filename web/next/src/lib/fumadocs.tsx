import { site } from "@packages/config/site"
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page"
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared"
import type { Metadata } from "next"

import { CopyAsMarkdown } from "@/components/docs/copy-as-markdown"
import { formatBlogDate, toBlogDate } from "@/lib/blog-policy"
import { config } from "@/lib/config"
import type { ContentKind, ContentSource, PageOf } from "@/lib/content"
import { getMDXComponents } from "@/mdx-components"

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: site.name,
    },
  }
}

// A blog article is any published post, i.e. a blog page that is not the /blog index.
function blogArticle<K extends ContentKind>(cs: ContentSource<K>, page: PageOf<K>) {
  if (cs.kind !== "blog" || page.url === "/blog") return null
  return page as PageOf<"blog">
}

export function renderPageContent<K extends ContentKind>(cs: ContentSource<K>, page: PageOf<K>) {
  const MDX = page.data.body
  const isDocsPage = cs.kind === "docs"
  const isBlogMainPage = cs.kind === "blog" && page.url === "/blog"
  const article = blogArticle(cs, page)
  const publishedAt = article?.data.publishedAt

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
            a: cs.relativeLink(page),
          })}
        />
      </DocsBody>
      {article && publishedAt && (
        <div className="not-prose text-muted-foreground mt-4 flex flex-wrap justify-end gap-x-3 gap-y-1 text-right text-sm">
          <time dateTime={publishedAt}>Published {formatBlogDate(publishedAt)}</time>
          {article.data.updatedAt && article.data.updatedAt !== publishedAt && (
            <time dateTime={article.data.updatedAt}>
              Updated {formatBlogDate(article.data.updatedAt)}
            </time>
          )}
        </div>
      )}
    </DocsPage>
  )
}

export async function generatePageMetadata<K extends ContentKind>(
  cs: ContentSource<K>,
  page: PageOf<K>,
): Promise<Metadata> {
  const pageUrl = `${config.app.url}${page.url}`
  const slugPath = page.url.slice(cs.baseUrl.length).replace(/^\//, "")
  // Intentional cache-bust: the build/revalidation timestamp ties the OG URL to each deploy so social and CDN scrapers refetch the regenerated image instead of serving a stale one; not a bug.
  const imageUrl = `${config.app.url}/og${cs.baseUrl}${slugPath ? `/${slugPath}` : ""}?t=${Date.now()}`
  const article = blogArticle(cs, page)
  const publishedTime = article?.data.publishedAt
    ? toBlogDate(article.data.publishedAt).toISOString()
    : undefined
  const modifiedTime = article?.data.publishedAt
    ? toBlogDate(article.data.updatedAt ?? article.data.publishedAt).toISOString()
    : undefined
  const image = { url: imageUrl, width: 1200, height: 630, alt: page.data.title }
  const openGraph = article
    ? {
        type: "article" as const,
        title: page.data.title,
        description: page.data.description,
        siteName: site.name,
        url: pageUrl,
        images: [image],
        publishedTime,
        modifiedTime,
        authors: article.data.author ? [article.data.author] : undefined,
        tags: article.data.tags,
      }
    : {
        type: "website" as const,
        title: page.data.title,
        description: page.data.description,
        siteName: site.name,
        url: pageUrl,
        images: [image],
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
