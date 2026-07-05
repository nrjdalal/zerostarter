// Single source of truth for docs structure + metadata; the sidebar, meta.json, MDX frontmatter, and existence checks all derive from web/next/docs.config.ts.

// Per-page metadata, stored under the page's URL key (e.g. "/docs/getting-started/architecture"); title/description are synced into the MDX frontmatter.
export type DocsMeta = {
  title: string
  description?: string
  // Sidebar label; defaults to title and is written to frontmatter only when it differs.
  label?: string
}

// One ordered entry in a group: a single-key record keyed by a page URL (value = metadata) or a subgroup label (value = nested items), nestable to any depth.
export type DocsItem = Record<string, DocsMeta | DocsItem[]>

// A collection maps group labels to their ordered items.
export type DocsCollection = Record<string, DocsItem[]>

// Each collection's content dir mirrors its URL base: docs -> content/docs, console -> content/console/docs.
export type DocsConfig = {
  docs: DocsCollection
  console: DocsCollection
}

// Resolved sidebar shape (output of resolveDocsNav): a page is a leaf with a url, a group is a label with nested nodes.
export type NavItem = { title: string; url: string }
export type NavGroup = { label: string; items: NavNode[] }
export type NavNode = NavItem | NavGroup
