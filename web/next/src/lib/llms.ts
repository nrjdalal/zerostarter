import { decodeHTML } from "entities"

import { config } from "@/lib/config"

type LLMPage = {
  url: string
  data: {
    title?: string
    getText: (type: "processed" | "raw") => Promise<string>
  }
}

export const llmTextHeaders = {
  "Content-Type": "text/markdown; charset=utf-8",
} as const

export async function getLLMText(page: LLMPage) {
  let body: string

  try {
    body = (await page.data.getText("processed")).trim()
  } catch {
    body = (await page.data.getText("raw")).trim()
  }

  // Fumadocs' processed markdown HTML-escapes some chars (e.g. **bold** -> &#x2A;*); decode so the LLM text is clean.
  body = decodeHTML(body)

  const pageTitle = page.data.title ?? page.url

  return `# [${pageTitle}](${config.app.url}${page.url})

${body}`
}
