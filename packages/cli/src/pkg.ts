export interface Pkg {
  name?: string
  version?: string
  scripts?: Record<string, unknown>
  dependencies?: Record<string, unknown>
  devDependencies?: Record<string, unknown>
  overrides?: Record<string, unknown>
  catalog?: Record<string, unknown>
  [key: string]: unknown
}

// package.json identity fields the fork owns on its root manifest (mirrors convert.ts rebrand).
const IDENTITY_FIELDS = [
  "name",
  "version",
  "homepage",
  "bugs",
  "license",
  "author",
  "repository",
  "funding",
]

// Parse the "# PRESERVE_ON_SYNC - <paths>" directive from the starter's .gitpickignore.
export const parsePreserve = (gitpickignore: string): string[] => {
  const marker = "# PRESERVE_ON_SYNC"
  const line = gitpickignore.split("\n").find((l) => l.trim().startsWith(marker))
  if (!line) return []
  return line
    .trim()
    .slice(marker.length)
    .replace(/^\s*-\s*/, "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

// Merge two package.json object fields (later wins shared keys); undefined when both empty.
export const merge = (first: unknown, second: unknown): Record<string, unknown> | undefined => {
  const both = { ...(first as Record<string, unknown>), ...(second as Record<string, unknown>) }
  return Object.keys(both).length > 0 ? both : undefined
}

// Union two possible string arrays (starter entries first); undefined if neither is an array.
export const unionArrays = (fork: unknown, starter: unknown): string[] | undefined => {
  const f = Array.isArray(fork) ? (fork as string[]) : []
  const s = Array.isArray(starter) ? (starter as string[]) : []
  return f.length || s.length ? [...new Set([...s, ...f])] : undefined
}

// Starter-base merge: shared fields take the starter's latest (deps, scripts, overrides, packageManager, commitlint) so a re-baseline updates tooling; workspaces union so a fork's area is never dropped; the fork keeps its extra keys/deps and (root) identity. Dropped deps aren't auto-removed; review the diff.
export const mergePkg = (fork: Pkg, starter: Pkg, isRoot: boolean): Pkg => {
  const next: Pkg = { ...starter }
  // Keep the fork's own top-level keys the starter does not define (browserslist, engines, ...).
  for (const key of Object.keys(fork)) if (!(key in starter)) next[key] = fork[key]
  const deps = merge(fork.dependencies, starter.dependencies)
  const devDeps = merge(fork.devDependencies, starter.devDependencies)
  const catalog = merge(fork.catalog, starter.catalog)
  const scripts = merge(fork.scripts, starter.scripts)
  const overrides = merge(fork.overrides, starter.overrides)
  const workspaces = unionArrays(fork.workspaces, starter.workspaces)
  if (deps) next.dependencies = deps
  if (devDeps) next.devDependencies = devDeps
  if (catalog) next.catalog = catalog
  if (scripts) next.scripts = scripts
  if (overrides) next.overrides = overrides
  if (workspaces) next.workspaces = workspaces
  if (isRoot) {
    for (const field of IDENTITY_FIELDS) {
      if (field in fork) next[field] = fork[field]
      else delete next[field]
    }
  }
  return next
}
