import type { Metadata } from "next"

import { generatePageMetadata, getPageData, renderPageContent } from "@/lib/fumadocs"
import { blogSource } from "@/lib/source"

export default async function Page() {
  // The root blog page resolves from content/blog/index.mdx.
  const pageData = await getPageData({}, blogSource)
  return renderPageContent(pageData)
}

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata(
    {},
    {
      source: blogSource,
      ogPath: "/api/og/blog",
      ogType: "website",
    },
  )
}
