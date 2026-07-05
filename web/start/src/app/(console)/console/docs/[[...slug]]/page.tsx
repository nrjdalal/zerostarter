import { getPageData, renderPageContent } from "@/lib/fumadocs"
import { consoleSource } from "@/lib/source"

export default async function Page(props: { params: Promise<{ slug?: string[] }> }) {
  const pageData = await getPageData(props.params, consoleSource)
  return renderPageContent(pageData)
}
