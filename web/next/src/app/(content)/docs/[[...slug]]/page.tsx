import type { Metadata } from "next"

import {
  createGenerateStaticParams,
  generatePageMetadata,
  getPageData,
  renderPageContent,
} from "@/lib/fumadocs"
import { docsSource } from "@/lib/source"

export default async function Page(props: { params: Promise<{ slug?: string[] }> }) {
  const pageData = await getPageData(props.params, docsSource)
  return renderPageContent(pageData)
}

export const generateStaticParams = createGenerateStaticParams(docsSource)

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>
}): Promise<Metadata> {
  return generatePageMetadata(props.params, {
    source: docsSource,
    ogPath: "/api/og/docs",
    ogType: "website",
  })
}
