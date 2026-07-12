import type { Metadata } from "next"

import { contentSource } from "@/lib/content"
import { generatePageMetadata, renderPageContent } from "@/lib/fumadocs"

const docs = contentSource("docs")

export default async function Page(props: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await props.params
  return renderPageContent(docs, docs.getPageOr404(slug))
}

export function generateStaticParams() {
  return docs.params()
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>
}): Promise<Metadata> {
  const { slug } = await props.params
  return generatePageMetadata(docs, docs.getPageOr404(slug))
}
