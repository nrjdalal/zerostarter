import { StreamableHTTPTransport } from "@hono/mcp"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { env } from "@packages/env/api-hono"
import { Hono } from "hono"
import { z } from "zod"

// the docs content lives in the web app, so the docs tools read it over HTTP
// from the frontend's existing llms.txt and search endpoints
const appUrl = env.HONO_TRUSTED_ORIGINS[0]

async function fetchText(path: string): Promise<string | null> {
  try {
    const res = await fetch(`${appUrl}${path}`, {
      headers: { accept: "text/markdown, text/plain, application/json" },
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

function cleanSlug(path: string): string {
  const slug = path
    .trim()
    .replace(/^https?:\/\/[^/]+/, "")
    .replace(/^\/+/, "")
    .replace(/^docs\/?/, "")
    .replace(/\.(md|mdx|txt)$/, "")
    .replace(/\/+$/, "")
  return slug === "index" ? "" : slug
}

const mcpServer = new McpServer({ name: "zerostarter-docs", version: "1.0.0" })

mcpServer.registerTool(
  "list_docs",
  {
    title: "List documentation pages",
    description:
      "List every ZeroStarter documentation page with its title, path, and description. Call this first to discover what docs exist, then fetch one with get_doc.",
    inputSchema: {},
  },
  async () => {
    const index = await fetchText("/llms.txt")
    if (!index) {
      return {
        content: [{ type: "text", text: "Failed to load the documentation index." }],
        isError: true,
      }
    }
    return { content: [{ type: "text", text: index }] }
  },
)

mcpServer.registerTool(
  "get_doc",
  {
    title: "Get a documentation page",
    description:
      'Fetch a single ZeroStarter documentation page as Markdown. Pass the page path from list_docs (e.g. "manage/og-images" or "index"). A leading "docs/" or "/" is accepted.',
    inputSchema: {
      path: z.string().describe('Doc path, e.g. "manage/og-images" or "index"'),
    },
  },
  async ({ path }) => {
    const slug = cleanSlug(path)
    const markdown = await fetchText(`/llms.txt/docs${slug ? `/${slug}` : ""}`)
    if (!markdown) {
      return {
        content: [
          {
            type: "text",
            text: `No documentation page found for "${path}". Call list_docs to see valid paths.`,
          },
        ],
        isError: true,
      }
    }
    return { content: [{ type: "text", text: markdown }] }
  },
)

mcpServer.registerTool(
  "search_docs",
  {
    title: "Search documentation",
    description:
      "Full-text search across ZeroStarter documentation. Returns matching pages with their URL; read one in full with get_doc.",
    inputSchema: {
      query: z.string().describe("Search query"),
    },
  },
  async ({ query }) => {
    if (!query.trim()) {
      return { content: [{ type: "text", text: "Provide a non-empty query." }], isError: true }
    }

    let results: unknown
    try {
      const res = await fetch(`${appUrl}/api/search?query=${encodeURIComponent(query)}`, {
        headers: { accept: "application/json" },
      })
      if (!res.ok) throw new Error(`search responded ${res.status}`)
      results = await res.json()
    } catch {
      return {
        content: [{ type: "text", text: "Documentation search is unavailable." }],
        isError: true,
      }
    }

    if (!Array.isArray(results) || results.length === 0) {
      return { content: [{ type: "text", text: `No documentation matched "${query}".` }] }
    }

    const seen = new Set<string>()
    const lines: string[] = []
    for (const hit of results as { url?: string; content?: string }[]) {
      const url = hit.url ?? ""
      const content = (hit.content ?? "")
        .replace(/<\/?mark>/g, "")
        .replace(/\s+/g, " ")
        .trim()
      const key = `${url}|${content}`
      if (!content || seen.has(key)) continue
      seen.add(key)
      lines.push(`- ${content}${url ? ` (${appUrl}${url})` : ""}`)
      if (lines.length >= 12) break
    }

    return { content: [{ type: "text", text: lines.join("\n") }] }
  },
)

const transport = new StreamableHTTPTransport()

export const mcpRouter = new Hono().all("/", async (c) => {
  if (!mcpServer.isConnected()) {
    await mcpServer.connect(transport)
  }
  return (await transport.handleRequest(c)) ?? c.body(null, 202)
})
