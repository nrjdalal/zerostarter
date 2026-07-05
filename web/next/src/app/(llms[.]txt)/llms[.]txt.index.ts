import { site } from "@packages/config/site"
import { createFileRoute } from "@tanstack/react-router"

import docsMeta from "@/../content/docs/meta.json"
import { config } from "@/lib/config"
import { llmTextHeaders } from "@/lib/llms"
import { sortByMeta } from "@/lib/sort-by-meta"
import { docsSource } from "@/lib/source"

export const Route = createFileRoute("/(llms.txt)/llms.txt/")({
  server: {
    handlers: {
      GET: async () => {
        const docsPages = sortByMeta(docsSource.getPages(), docsMeta.pages, "/docs")
        const docsIndex = docsPages
          .map((p) => `- [${p.data.title}](${config.app.url}${p.url}.md): ${p.data.description}`)
          .join("\n")

        return new Response(
          `# ${site.name}

> ${site.description}

## Documentation

> Complete documentation for ${site.name}

${docsIndex}

## Optional

- [Blog](${config.app.url}/blog.md): Latest articles and updates about ${site.name}
`,
          {
            headers: llmTextHeaders,
          },
        )
      },
    },
  },
})
