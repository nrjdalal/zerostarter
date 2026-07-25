import { join, resolve } from "node:path"

import { fixDangling } from "@/convert"
import { parseForkLayout } from "@/fork-layout"
import {
  bunInstall,
  fetchGitpickignore,
  gitRestore,
  overlayZerostarter,
  requireCleanRepo,
  withRollback,
} from "@/git"
import { exists, findPackageJsons, readJson, remove, writeJson } from "@/io"
import { mergePkg, type Pkg } from "@/pkg"
import { type SkillSyncResult, snapshotForkSkills, syncForkSkills } from "@/skills"

import { parseArgsOrExit } from "./_args"
import { ensureBun } from "./_bun"
import { intro, link, logStep, logWarn, note, orange, outro, yellow } from "./_prompt"

const helpMessage = `Usage:
  $ bunx zerostarter sync [dir] [options]

Re-baseline an existing fork (default .) on the latest ZeroStarter: a gitpick overlay
updates the starter files while your content, public/marketing, branding, package.json
identity, and favicon are preserved. Requires a clean tree; lands as a reviewable diff
you commit yourself.

Options:
  -h, --help     Display help`

// Re-baseline a fork on the latest ZeroStarter, preserving its content, branding, and package.json.
export const sync = async (argv: string[]) => {
  const { positionals, values } = parseArgsOrExit(helpMessage, {
    allowPositionals: true,
    args: argv,
    options: { help: { short: "h", type: "boolean" } },
  })

  if (values.help) {
    console.log(helpMessage)
    return
  }

  await ensureBun()

  const target = resolve(positionals[0] ?? ".")

  await requireCleanRepo(
    target,
    `No git repository in ${target}. Run sync inside an existing fork.`,
    "Working tree has uncommitted changes. Commit or stash them first so the sync lands as a reviewable diff.",
  )

  intro(link("https://zerostarter.dev"))

  const rootPkg = join(target, "package.json")
  // Snapshot every workspace manifest before the overlay overwrites them (web/next + api/hono carry the deps).
  const forkPkgs = new Map(findPackageJsons(target).map((p) => [p, readJson<Pkg>(p)]))
  // Snapshot every skill too: the overlay re-adds upstream SKILL.md files, and the reconcile decides per skill, from this snapshot, whether the fork owns it.
  const forkSkills = snapshotForkSkills(target)

  // Read the preserve directive before the overlay, so a fetch error aborts before mutating the fork.
  const preserve = parseForkLayout(await fetchGitpickignore()).preserve
  if (preserve.length === 0) {
    logWarn("No PRESERVE_ON_SYNC directive found; fork-owned files may be overwritten.")
  }

  // Run overlay + reconcile atomically; withRollback resets to the pre-sync commit on any failure.
  let skills: SkillSyncResult = { added: [], kept: [], skipped: [], unverified: [], updated: [] }
  await withRollback(
    target,
    yellow("Sync failed; rolled the working tree back to your last commit."),
    async () => {
      await overlayZerostarter(target)
      // Reconcile files the overlay re-added that mix shared + author-only code (fonts.ts, navbar).
      fixDangling(target)
      // gitpick never copies the ignore file, but drop any that slipped through.
      remove(join(target, ".gitpickignore"))
      // Re-merge every fork manifest: starter's latest + the fork's extra deps, and the root's identity.
      for (const [path, forkPkg] of forkPkgs) {
        if (!exists(path)) continue
        writeJson(path, mergePkg(forkPkg, readJson<Pkg>(path), path === rootPkg))
      }
      // Reconcile the overlaid skills to the fork, honoring provenance: only note-intact, uncustomized upstream-sourced skills take the fresh body; everything else is restored from the pre-overlay snapshot.
      skills = syncForkSkills(target, forkSkills)
      // Restore the fork-owned local files the .gitpickignore directive names (favicon, audit record).
      await gitRestore(target, preserve)
    },
  )

  logStep("Overlaid the latest ZeroStarter (content, public/marketing, and branding preserved)")

  await bunInstall(target)

  note(
    [
      "Starter files were updated (edits overwritten); your content, public/marketing, and branding were preserved.",
      skills.added.length > 0 && `Skills added from upstream: ${skills.added.join(", ")}`,
      skills.updated.length > 0 && `Skills updated from upstream: ${skills.updated.join(", ")}`,
      skills.unverified.length > 0 &&
        yellow(
          `Skills overwritten without a sync stamp (this sync adds one; recover any customization from the diff): ${skills.unverified.join(", ")}`,
        ),
      skills.skipped.length > 0 &&
        `Skills left untouched (customized or sync note removed; the fork owns them): ${skills.skipped.join(", ")}`,
      skills.kept.length > 0 &&
        `Skills left untouched (local or vendored provenance): ${skills.kept.join(", ")}`,
      yellow(`Review the diff and commit: git -C ${target} status`),
    ]
      .filter((line): line is string => Boolean(line))
      .join("\n"),
    "Review the changes",
  )
  outro(orange("Synced to the latest ZeroStarter"))
}
