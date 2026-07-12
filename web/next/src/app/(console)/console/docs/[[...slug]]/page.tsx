import { contentSource } from "@/lib/content"
import { renderPageContent } from "@/lib/fumadocs"

const consoleDocs = contentSource("console")

export default async function Page(props: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await props.params
  return renderPageContent(consoleDocs, consoleDocs.getPageOr404(slug))
}
