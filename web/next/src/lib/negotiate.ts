import { preferredType } from "@/lib/accept"

// The markdown content negotiation decision (acceptmarkdown.com), kept free of next/server so it is unit-testable; proxy.ts applies it.
const PRODUCES = ["text/html", "text/markdown"] as const

export type Negotiation =
  | { kind: "html"; vary: boolean }
  | { kind: "markdown"; path: string }
  | { kind: "not-acceptable"; requested: string }
  | { kind: "skip" }

// The llms.txt route that holds a page's markdown: the index for the homepage, and the same handlers the .md rewrites in next.config.ts reach for docs and blog. Null for a page with no markdown, which negotiation then leaves alone.
export function markdownPathFor(pathname: string): string | null {
  if (pathname === "/") return "/llms.txt"
  if (pathname === "/blog" || pathname.startsWith("/blog/")) return `/llms.txt${pathname}`
  if (pathname === "/docs" || pathname.startsWith("/docs/")) return `/llms.txt${pathname}`
  return null
}

export function negotiateMarkdown(request: {
  accept: string | null
  method: string
  nextInternal: boolean
  pathname: string
}): Negotiation {
  // Next's own traffic (RSC payloads, prefetches, server actions) is not a document request; never negotiate it.
  if (request.method !== "GET" && request.method !== "HEAD") return { kind: "skip" }
  if (request.nextInternal) return { kind: "skip" }

  // An explicit markdown URL is one representation, not a negotiation: it keeps going to the rewrite, marked so caches know Accept matters for its sibling.
  if (request.pathname.endsWith(".md") || request.pathname.endsWith(".txt")) {
    return { kind: "html", vary: true }
  }

  const path = markdownPathFor(request.pathname)
  if (!path) return { kind: "skip" }

  const chosen = preferredType(request.accept, PRODUCES)
  if (chosen === "text/markdown") return { kind: "markdown", path }
  if (chosen === null) return { kind: "not-acceptable", requested: request.accept ?? "" }
  return { kind: "html", vary: true }
}
