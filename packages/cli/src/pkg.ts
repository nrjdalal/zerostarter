export interface Pkg {
  name?: string
  version?: string
  scripts?: Record<string, unknown>
  dependencies?: Record<string, unknown>
  devDependencies?: Record<string, unknown>
  overrides?: Record<string, unknown>
  catalog?: Record<string, unknown>
  catalogs?: Record<string, unknown>
  [key: string]: unknown
}

// package.json author fields the starter carries that a fork does not inherit (convert.ts rebrand deletes these).
export const AUTHOR_FIELDS = ["homepage", "bugs", "license", "author", "repository", "funding"]

// Root identity fields the fork owns on sync: name/version plus the author fields (restored-or-dropped).
const IDENTITY_FIELDS = ["name", "version", ...AUTHOR_FIELDS]

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

// Every dependency + config map sync merges (the starter's latest wins on shared keys, fork extras stay).
const MERGE_FIELDS = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
  "resolutions",
  "catalog",
  // Merges at the group name, so a fork's own named catalog survives while a group the starter also defines takes the starter's.
  "catalogs",
  "scripts",
  "overrides",
]

// Starter-base merge: shared map fields take the starter's latest so a re-baseline updates tooling; workspaces union so a fork's area is never dropped; the fork keeps its extra keys and (root) identity. Dropped deps aren't auto-removed; review the diff.
export const mergePkg = (fork: Pkg, starter: Pkg, isRoot: boolean): Pkg => {
  const next: Pkg = { ...starter }
  // Keep the fork's own top-level keys the starter does not define (browserslist, engines, ...).
  for (const key of Object.keys(fork)) if (!(key in starter)) next[key] = fork[key]
  // Merge every dependency + config map so the fork's extras in any of them survive a re-baseline.
  for (const field of MERGE_FIELDS) {
    const merged = merge(fork[field], starter[field])
    if (merged) next[field] = merged
  }
  // workspaces is additive: union so a fork's area (apps/*) is never dropped.
  const workspaces = unionArrays(fork.workspaces, starter.workspaces)
  if (workspaces) next.workspaces = workspaces
  if (isRoot) {
    for (const field of IDENTITY_FIELDS) {
      if (field in fork) next[field] = fork[field]
      else delete next[field]
    }
  }
  return next
}
