import { join, resolve } from "node:path"

import { bunInstall, fetchGitpickignore, gitIsClean, gitRestore, overlayZerostarter } from "@/git"
import { exists, readJson, remove, writeJson } from "@/io"

import { orange, yellow } from "./_prompt"

// package.json identity fields a fork owns: sync restores the fork's value (the overlay brought the
// starter's) or drops the starter's if the fork set none. Mirrors convert.ts rebrand's deletions.
const IDENTITY_FIELDS = [
  "description",
  "homepage",
  "bugs",
  "license",
  "author",
  "repository",
  "funding",
]

// The paths sync restores after the overlay are declared once in the starter's .gitpickignore as
// `# PRESERVE_ON_SYNC - <comma-separated>` (files init seeds but a fork keeps: favicon, audit record).
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

interface Pkg {
  name?: string
  version?: string
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  [key: string]: unknown
}

// Re-baseline an existing fork on the latest ZeroStarter: a gitpick overlay updates the starter
// files while the starter's .gitpickignore keeps the fork's content, public/marketing, and site.ts.
// Files the fork added are untouched; the fork's package.json identity and favicon/icon are kept.
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

  const pkgPath = join(target, "package.json")
  const forkPkg = exists(pkgPath) ? readJson<Pkg>(pkgPath) : null

  // Read the preserve directive from the starter's .gitpickignore (gitpick never copies it into a
  // fork). Best-effort: an unreachable or older starter just skips the extra preservation.
  let preserve: string[] = []
  try {
    preserve = parsePreserve(await fetchGitpickignore())
  } catch {
    console.log(
      yellow("Could not read the starter's .gitpickignore; skipping favicon/audit preservation."),
    )
  }

  console.log()
  console.log(
    "Overlaying the latest ZeroStarter (content, public/marketing, and site.ts preserved) ...",
  )
  overlayZerostarter(target)

  // gitpick never copies the ignore file, but drop any that slipped through.
  remove(join(target, ".gitpickignore"))

  // The overlay replaced package.json with the starter's. Restore the fork's identity and custom
  // scripts, and keep its extra dependencies while taking the starter's latest shared versions.
  if (forkPkg && exists(pkgPath)) {
    const next = readJson<Pkg>(pkgPath)
    next.name = forkPkg.name
    next.version = forkPkg.version
    for (const field of IDENTITY_FIELDS) {
      if (field in forkPkg) next[field] = forkPkg[field]
      else delete next[field]
    }
    next.dependencies = { ...forkPkg.dependencies, ...next.dependencies }
    next.devDependencies = { ...forkPkg.devDependencies, ...next.devDependencies }
    next.scripts = { ...forkPkg.scripts, ...next.scripts }
    writeJson(pkgPath, next)
  }

  // Keep the fork-owned paths the .gitpickignore directive names (init seeds them, sync keeps them).
  gitRestore(target, preserve)

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
