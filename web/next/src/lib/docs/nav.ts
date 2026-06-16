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
      if (value.publish === false) continue
      nodes.push({ title: value.label ?? value.title, url: key })
    }
  }
  return nodes
}

// Builds the sidebar nav for a collection from docs.config (recursively). A page is keyed by its
// URL (used directly as the link); a subgroup is keyed by its label. Titles come from the config
// (nav ?? title). Pure (the key is the URL), so no source lookup is needed.
export function resolveDocsNav(collection: keyof typeof docsConfig): NavGroup[] {
  return Object.entries(docsConfig[collection]).map(([label, items]) => ({
    label,
    items: resolveItems(items as DocsItem[]),
  }))
}
