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

// Orders pages by an explicit slug list (from docs.config), slug derived by stripping baseUrl; pages not in the list fall to the end. Used by the llms.txt routes to match sidebar order.
export function sortByMeta<T extends { url: string }>(
  pages: T[],
  order: string[],
  baseUrl: string,
): T[] {
  const getSlug = (url: string) => url.replace(baseUrl, "").replace(/^\//, "") || "index"

  // Create a position lookup map for O(1) lookups during sorting
  const positionMap = new Map<string, number>()
  order.forEach((slug, index) => positionMap.set(slug, index))

  return [...pages].sort((a, b) => {
    const slugA = getSlug(a.url)
    const slugB = getSlug(b.url)
    const posA = positionMap.get(slugA)
    const posB = positionMap.get(slugB)

    // Pages not in order go to the end
    if (posA === undefined && posB === undefined) return 0
    if (posA === undefined) return 1
    if (posB === undefined) return -1

    return posA - posB
  })
}
