// Single source of truth for docs structure + metadata. The sidebar, meta.json (reading
// order + prev/next), MDX frontmatter, and existence checks are all derived from
// web/next/docs.config.ts.

// Per-page metadata, stored under the page's URL key (e.g. "/docs/getting-started/architecture").
// title/description/publish are synced into the MDX frontmatter; `label` overrides the sidebar
// label (defaults to title, written only when it differs); `publish: false` drops the page from
// nav/tree and marks it a draft.
export type DocsMeta = {
  title: string
  description?: string
  label?: string
  publish?: boolean
}

// One ordered entry in a group: a single-key record. If the value is metadata it's a page
// (key = the page's URL); if the value is an array it's a nested subgroup (key = label), to
// any depth.
export type DocsItem = Record<string, DocsMeta | DocsItem[]>

// A collection maps group labels to their ordered items.
export type DocsCollection = Record<string, DocsItem[]>

// Collection names map 1:1 to content/<name> directories.
export type DocsConfig = {
  docs: DocsCollection
  console: DocsCollection
}

// Resolved sidebar shape (output of resolveDocsNav, consumed by SidebarDocsContent):
// a page is a leaf with a url; a group is a label with nested nodes.
export type NavItem = { title: string; url: string }
export type NavGroup = { label: string; items: NavNode[] }
export type NavNode = NavItem | NavGroup
