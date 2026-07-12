import { site } from "@packages/config/site"

import docsMeta from "@/../content/docs/meta.json"
import { contentSource } from "@/lib/content"
import { getLLMText, llmTextHeaders, sortByMeta } from "@/lib/llms"

export const dynamic = "force-static"
export const revalidate = 60

export async function GET() {
  // pages() already applies each kind's feature gate and blog publish policy, returning [] when off.
  const pages = [
    ...sortByMeta(contentSource("docs").pages(), docsMeta.pages, "/docs"),
    ...contentSource("blog").pages(),
  ]

  const scanned = await Promise.all(pages.map(getLLMText))

  return new Response(
    `# ${site.name} – LLM Context File

> ${site.description}

${site.llmsFullPreamble}

---

${scanned.join("\n\n---\n\n")}`,
    {
      headers: llmTextHeaders,
    },
  )
}
