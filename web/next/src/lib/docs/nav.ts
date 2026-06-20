import docsConfig from "../../../docs.config"
import type { DocsItem, NavGroup, NavNode } from "./types"

function resolveItems(items: DocsItem[]): NavNode[] {
  const nodes: NavNode[] = []
  for (const item of items) {
    const entry = Object.entries(item)[0]
    if (!entry) continue
    const [key, value] = entry
    if (Array.isArray(value)) {
      const resolved = resolveItems(value)
      if (resolved.length) nodes.push({ label: key, items: resolved })
    } else {
      nodes.push({ title: value.label ?? value.title, url: key })
    }
  }
  return nodes
}

// Builds the sidebar nav for a collection from docs.config: a page is keyed by its URL (used directly as the link), a subgroup by its label; titles come from the config (label ?? title).
export function resolveDocsNav(collection: keyof typeof docsConfig): NavGroup[] {
  return Object.entries(docsConfig[collection]).map(([label, items]) => ({
    label,
    items: resolveItems(items as DocsItem[]),
  }))
}

// True when the pathname sits inside a docs collection (any "docs" path segment, e.g. /docs/* or /console/docs/*). Single source for the docs-mode UX: offcanvas sidebar + desktop edge tab.
export function isDocsPath(pathname: string): boolean {
  return pathname.split("/").includes("docs")
}
