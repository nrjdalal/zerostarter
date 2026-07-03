import { join, resolve } from "node:path"

import { fixDangling } from "@/convert"
import {
  bunInstall,
  fetchGitpickignore,
  gitIsClean,
  gitResetHard,
  gitRestore,
  overlayZerostarter,
} from "@/git"
import { exists, findPackageJsons, readJson, remove, writeJson } from "@/io"

import { orange, yellow } from "./_prompt"

interface Pkg {
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
const parsePreserve = (gitpickignore: string): string[] => {
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
const merge = (first: unknown, second: unknown): Record<string, unknown> | undefined => {
  const both = { ...(first as Record<string, unknown>), ...(second as Record<string, unknown>) }
  return Object.keys(both).length > 0 ? both : undefined
}

// Starter-base merge: the starter's latest tooling/deps win, the fork keeps its extra keys/deps and scripts, and the root keeps its identity. A dep the starter dropped is not auto-removed.
const mergePkg = (fork: Pkg, starter: Pkg, isRoot: boolean): Pkg => {
  const next: Pkg = { ...starter }
  // Keep the fork's own top-level keys the starter does not define (browserslist, engines, ...).
  for (const key of Object.keys(fork)) if (!(key in starter)) next[key] = fork[key]
  const deps = merge(fork.dependencies, starter.dependencies)
  const devDeps = merge(fork.devDependencies, starter.devDependencies)
  const catalog = merge(fork.catalog, starter.catalog)
  const scripts = merge(starter.scripts, fork.scripts)
  const overrides = merge(fork.overrides, starter.overrides)
  if (deps) next.dependencies = deps
  if (devDeps) next.devDependencies = devDeps
  if (catalog) next.catalog = catalog
  if (scripts) next.scripts = scripts
  if (overrides) next.overrides = overrides
  if (isRoot) {
    for (const field of IDENTITY_FIELDS) {
      if (field in fork) next[field] = fork[field]
      else delete next[field]
    }
  }
  return next
}

// Re-baseline a fork on the latest ZeroStarter, preserving its content, branding, and package.json.
export const sync = async (argv: string[]) => {
  const target = resolve(argv[0] ?? ".")

  if (!exists(join(target, ".git"))) {
    throw new Error(`No git repository in ${target}. Run sync inside an existing fork.`)
  }
  if (!gitIsClean(target)) {
    throw new Error(
      "Working tree has uncommitted changes. Commit or stash them first so the sync lands as a reviewable diff.",
    )
  }

  const rootPkg = join(target, "package.json")
  // Snapshot every workspace manifest before the overlay overwrites them (web/next + api/hono carry the deps).
  const forkPkgs = new Map(findPackageJsons(target).map((p) => [p, readJson<Pkg>(p)]))

  // Read the preserve directive before the overlay, so a fetch error aborts before mutating the fork.
  const preserve = parsePreserve(await fetchGitpickignore())

  console.log()
  console.log(
    "Overlaying the latest ZeroStarter (content, public/marketing, and site.ts preserved) ...",
  )

  // Run overlay + reconcile atomically; roll back to the pre-sync commit on any failure (tree was clean).
  try {
    overlayZerostarter(target)

    // Reconcile files the overlay re-added that mix shared + author-only code (fonts.ts, navbar), as init does.
    fixDangling(target)

    // gitpick never copies the ignore file, but drop any that slipped through.
    remove(join(target, ".gitpickignore"))

    // Re-merge every fork manifest: starter's latest + the fork's extra deps, and the root's identity.
    for (const [path, forkPkg] of forkPkgs) {
      if (!exists(path)) continue
      writeJson(path, mergePkg(forkPkg, readJson<Pkg>(path), path === rootPkg))
    }

    // Restore the fork-owned local files the .gitpickignore directive names (favicon, audit record).
    gitRestore(target, preserve)
  } catch (err) {
    gitResetHard(target)
    console.log(yellow("Sync failed; rolled the working tree back to your last commit."))
    throw err
  }

  console.log("Installing dependencies ...")
  bunInstall(target)

  console.log()
  console.log(orange("Synced to the latest ZeroStarter."))
  console.log(
    "Starter files were updated (edits to them were overwritten); files you added and your",
  )
  console.log("content, public/marketing, and branding were preserved.")
  console.log(yellow(`Review the diff and commit: git -C ${target} status`))
}
