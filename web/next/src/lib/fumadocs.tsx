import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { getMDXComponents } from "@/mdx-components"
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page"
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared"
import { createRelativeLink } from "fumadocs-ui/mdx"

import { config } from "@/lib/config"
import type { blogSource, docsSource } from "@/lib/source"
import { CopyAsMarkdown } from "@/components/copy-as-markdown"

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: config.app.name,
    },
  }
}

type Source = typeof blogSource | typeof docsSource
type Page = NonNullable<ReturnType<Source["getPage"]>>

interface PageData {
  page: Page
  source: Source
}

export async function getPageData(
  params: Promise<{ slug?: string[] }>,
  source: Source,
): Promise<PageData> {
  const resolvedParams = await params
  const page = source.getPage(resolvedParams.slug)
  if (!page) notFound()
  return { page, source }
}

export function renderPageContent({ page, source }: PageData) {
  const MDX = page.data.body
  const isDocsPage = page.url.startsWith("/docs")
  const isBlogMainPage = page.url === "/blog"

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
            a: createRelativeLink(source, page),
          })}
        />
      </DocsBody>
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
  const imageUrl = `${config.app.url}${ogPath}${slugPath ? `/${slugPath}` : ""}?t=${Date.now()}`

  return {
    title: page.data.title,
    description: page.data.description,
    openGraph: {
      type: ogType,
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
    },
    other: {
      "og:logo": `${config.app.url}/favicon.ico`,
    },
    twitter: {
      card: "summary_large_image",
      images: [imageUrl],
    },
  }
}
