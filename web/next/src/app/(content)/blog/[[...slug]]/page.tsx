import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { generatePublishedBlogParams, isBlogIndexPage, isPublishedBlogPage } from "@/lib/blog"
import { toBlogDate } from "@/lib/blog-date"
import { config } from "@/lib/config"
import { generatePageMetadata, renderPageContent } from "@/lib/fumadocs"
import { blogSource } from "@/lib/source"

export const dynamic = "force-static"
export const revalidate = 60

export function generateStaticParams() {
  return generatePublishedBlogParams()
}

type BlogPage = NonNullable<ReturnType<typeof blogSource.getPage>>

function renderBlogPostJsonLd(page: BlogPage) {
  if (isBlogIndexPage(page) || !page.data.publishedAt) return null

  const pageUrl = `${config.app.url}${page.url}`
  const imageUrl = `${config.app.url}/og/blog/${page.slugs.join("/")}`
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: page.data.title,
    description: page.data.description,
    datePublished: toBlogDate(page.data.publishedAt).toISOString(),
    dateModified: toBlogDate(page.data.updatedAt ?? page.data.publishedAt).toISOString(),
    url: pageUrl,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": pageUrl,
    },
    image: imageUrl,
    articleSection: "Blog",
    publisher: {
      "@type": "Organization",
      name: config.app.name,
      url: config.app.url,
    },
    ...(page.data.author && {
      author: {
        "@type": "Person",
        name: page.data.author,
      },
    }),
    ...(page.data.tags &&
      page.data.tags.length > 0 && {
        keywords: page.data.tags.join(", "),
      }),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replaceAll("<", "\\u003c") }}
    />
  )
}

export default async function Page(props: { params: Promise<{ slug?: string[] }> }) {
  const params = await props.params
  const page = blogSource.getPage(params.slug)
  if (!page || !isPublishedBlogPage(page)) notFound()

  return (
    <>
      {renderBlogPostJsonLd(page)}
      {renderPageContent({ page, source: blogSource })}
    </>
  )
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>
}): Promise<Metadata> {
  const params = await props.params
  const page = blogSource.getPage(params.slug)
  if (!page || !isPublishedBlogPage(page)) notFound()

  return generatePageMetadata(Promise.resolve(params), {
    source: blogSource,
    ogPath: "/og/blog",
    ogType: isBlogIndexPage(page) ? "website" : "article",
  })
}
