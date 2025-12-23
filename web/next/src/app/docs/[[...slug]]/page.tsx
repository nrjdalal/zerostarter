import type { Metadata } from "next"

import {
  createGenerateStaticParams,
  generatePageMetadata,
  getPageData,
  renderPageContent,
} from "@/lib/fumadocs"
import { docsSource } from "@/lib/source"

export default async function Page(props: PageProps<"/docs/[[...slug]]">) {
  const pageData = await getPageData(props.params, docsSource)
  return renderPageContent(pageData)
}

export const generateStaticParams = createGenerateStaticParams(docsSource)

export async function generateMetadata(props: PageProps<"/docs/[[...slug]]">): Promise<Metadata> {
  return generatePageMetadata(props.params, {
    source: docsSource,
    ogPath: `/api/og/docs?t=${Date.now()}`,
    ogType: "website",
  })
}
