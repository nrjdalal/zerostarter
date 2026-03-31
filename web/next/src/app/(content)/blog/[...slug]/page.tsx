import type { Metadata } from "next"

import {
  createGenerateStaticParams,
  generatePageMetadata,
  getPageData,
  renderPageContent,
} from "@/lib/fumadocs"
import { blogSource } from "@/lib/source"

export default async function Page(props: { params: Promise<{ slug: string[] }> }) {
  const params = await props.params
  const pageData = await getPageData(params, blogSource)
  return renderPageContent(pageData)
}

export const generateStaticParams = createGenerateStaticParams(blogSource, { includeRoot: false })

export async function generateMetadata(props: {
  params: Promise<{ slug: string[] }>
}): Promise<Metadata> {
  const params = await props.params
  return generatePageMetadata(params, {
    source: blogSource,
    ogPath: "/api/og/blog",
    ogType: "article",
  })
}
