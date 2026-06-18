import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { generatePublicBlogParams, isBlogIndexPage, isPublicBlogPage } from "@/lib/blog"
import { generatePageMetadata, renderPageContent } from "@/lib/fumadocs"
import { blogSource } from "@/lib/source"

// Scheduling depends on Next's default dynamicParams (true): a scheduled post not prebuilt by generateStaticParams renders on demand once published, and revalidate=60 refreshes cached surfaces within ~60s. Setting dynamicParams=false would 404 scheduled posts until a redeploy.
export const dynamic = "force-static"
export const revalidate = 60

export function generateStaticParams() {
  return generatePublicBlogParams()
}

export default async function Page(props: { params: Promise<{ slug?: string[] }> }) {
  const params = await props.params
  const page = blogSource.getPage(params.slug)
  if (!page || !isPublicBlogPage(page)) notFound()

  return renderPageContent({ page, source: blogSource })
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>
}): Promise<Metadata> {
  const params = await props.params
  const page = blogSource.getPage(params.slug)
  if (!page || !isPublicBlogPage(page)) notFound()

  return generatePageMetadata(Promise.resolve(params), {
    source: blogSource,
    ogPath: "/og/blog",
    ogType: isBlogIndexPage(page) ? "website" : "article",
  })
}
