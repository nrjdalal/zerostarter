import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { getMDXComponents } from "@/mdx-components"
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page"
import { createRelativeLink } from "fumadocs-ui/mdx"

import { config } from "@/lib/config"
import { blogSource } from "@/lib/source"

export default async function Page(props: PageProps<"/blog/[[...slug]]">) {
  const params = await props.params
  const page = blogSource.getPage(params.slug)
  if (!page) notFound()

  const MDX = page.data.body

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            a: createRelativeLink(blogSource, page),
          })}
        />
      </DocsBody>
    </DocsPage>
  )
}

export async function generateStaticParams() {
  return blogSource.generateParams()
}

export async function generateMetadata(props: PageProps<"/blog/[[...slug]]">): Promise<Metadata> {
  const params = await props.params
  const page = blogSource.getPage(params.slug)
  if (!page) notFound()

  const pageUrl = `${config.app.url}${page.url}`
  const slugPath = params.slug && params.slug.length > 0 ? params.slug.join("/") : ""
  const imageUrl = `${config.app.url}/api/og/blog${slugPath ? `/${slugPath}` : ""}?t=${Date.now()}`

  return {
    title: page.data.title,
    description: page.data.description,
    openGraph: {
      type: "article",
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
