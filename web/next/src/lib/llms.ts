import { config } from "@/lib/config"
import type { blogSource, docsSource } from "@/lib/source"

type Source = typeof blogSource | typeof docsSource
type Page = NonNullable<ReturnType<Source["getPage"]>>

export const llmTextHeaders = {
  "Content-Type": "text/markdown; charset=utf-8",
} as const

export async function getLLMText(page: Page) {
  let content: string

  try {
    content = await page.data.getText("processed")
  } catch {
    content = await page.data.getText("raw")
  }

  return `# [${page.data.title}](${config.app.url}${page.url})
${content}`
}
