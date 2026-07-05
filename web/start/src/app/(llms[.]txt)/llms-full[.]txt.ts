import { site } from "@packages/config/site"
import { createFileRoute } from "@tanstack/react-router"

import docsMeta from "@/../content/docs/meta.json"
import { getPublishedBlogPosts } from "@/lib/blog"
import { getLLMText, llmTextHeaders } from "@/lib/llms"
import { sortByMeta } from "@/lib/sort-by-meta"
import { docsSource } from "@/lib/source"

export const Route = createFileRoute("/(llms.txt)/llms-full.txt")({
  server: {
    handlers: {
      GET: async () => {
        const pages = [
          ...sortByMeta(docsSource.getPages(), docsMeta.pages, "/docs"),
          ...getPublishedBlogPosts(),
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
      },
    },
  },
})
