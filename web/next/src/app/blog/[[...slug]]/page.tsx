import type { Metadata } from "next"

import {
  createGenerateStaticParams,
  generatePageMetadata,
  getPageData,
  renderPageContent,
} from "@/lib/fumadocs"
import { blogSource } from "@/lib/source"

export default async function Page(props: { params: Promise<{ slug?: string[] }> }) {
  const pageData = await getPageData(props.params, blogSource)
  return renderPageContent(pageData)
}

export const generateStaticParams = createGenerateStaticParams(blogSource)

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>
}): Promise<Metadata> {
  return generatePageMetadata(props.params, {
    source: blogSource,
    ogPath: `/api/og/blog?t=${Date.now()}`,
    ogType: "article",
  })
}
