import { join, resolve } from "node:path"

import { bunInstall, gitIsClean, gitRestore, overlayZerostarter } from "@/git"
import { exists, readJson, remove, writeJson } from "@/io"

import { orange, yellow } from "./_prompt"

// package.json fields the starter carries that a fork does not inherit (mirrors convert.ts rebrand).
const AUTHOR_FIELDS = ["homepage", "bugs", "license", "author", "repository", "funding"]

// Files init seeds as a default but sync must not overwrite (a fork's own favicon/branding).
const PRESERVE_ON_SYNC = ["web/next/src/app/favicon.ico", "web/next/src/app/icon.svg"]

interface Pkg {
  name?: string
  version?: string
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

  console.log()
  console.log(
    "Overlaying the latest ZeroStarter (content, public/marketing, and site.ts preserved) ...",
  )
  overlayZerostarter(target)

  // gitpick never copies the ignore file, but drop any that slipped through.
  remove(join(target, ".gitpickignore"))

  // The overlay replaced package.json with the starter's; restore the fork's identity and keep its
  // extra dependencies while taking the starter's latest versions for the ones they share.
  if (forkPkg && exists(pkgPath)) {
    const next = readJson<Pkg>(pkgPath)
    next.name = forkPkg.name
    next.version = forkPkg.version
    for (const field of AUTHOR_FIELDS) delete next[field]
    next.dependencies = { ...forkPkg.dependencies, ...next.dependencies }
    next.devDependencies = { ...forkPkg.devDependencies, ...next.devDependencies }
    writeJson(pkgPath, next)
  }

  // Keep the fork's own favicon/icon: init seeds these, but a re-baseline must not clobber them.
  gitRestore(target, PRESERVE_ON_SYNC)

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
