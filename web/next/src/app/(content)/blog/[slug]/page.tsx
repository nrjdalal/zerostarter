import type { Metadata } from "next"

import {
  createGenerateFlatStaticParams,
  generatePageMetadata,
  getPageData,
  renderPageContent,
} from "@/lib/fumadocs"
import { blogSource } from "@/lib/source"

export default async function Page(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params
  const pageData = await getPageData({ slug: [params.slug] }, blogSource)
  return renderPageContent(pageData)
}

export const generateStaticParams = createGenerateFlatStaticParams(blogSource)

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const params = await props.params
  return generatePageMetadata(
    { slug: [params.slug] },
    {
      source: blogSource,
      ogPath: "/api/og/blog",
      ogType: "article",
    },
  )
}
