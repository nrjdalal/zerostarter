import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { generatePublishedBlogParams, isPublishedBlogPage } from "@/lib/blog"
import { generatePageMetadata, renderPageContent } from "@/lib/fumadocs"
import { blogSource } from "@/lib/source"

export const dynamicParams = false

export default async function Page(props: { params: Promise<{ slug?: string[] }> }) {
  const params = await props.params
  const page = blogSource.getPage(params.slug)
  if (!page || !isPublishedBlogPage(page)) notFound()

  return renderPageContent({ page, source: blogSource })
}

export const generateStaticParams = generatePublishedBlogParams

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>
}): Promise<Metadata> {
  const params = await props.params
  const page = blogSource.getPage(params.slug)
  if (!page || !isPublishedBlogPage(page)) notFound()

  return generatePageMetadata(Promise.resolve(params), {
    source: blogSource,
    ogPath: "/og/blog",
    ogType: "article",
  })
}
