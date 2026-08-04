import { join, resolve } from "node:path"

import { fixDangling, ownsMarketingFonts, rebrandPortlessFromRoot } from "@/convert"
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
import {
  emptyReconcile,
  missingSkillTableMarkers,
  reconcileForkSkillsFromRoot,
  regenerateSkillTables,
  type SkillReconcile,
  snapshotSkills,
} from "@/skills"

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

  // Read the preserve directive before the overlay, so a fetch error aborts before mutating the fork.
  const preserve = parseForkLayout(await fetchGitpickignore()).preserve
  if (preserve.length === 0) {
    logWarn("No PRESERVE_ON_SYNC directive found; fork-owned files may be overwritten.")
  }

  // Both read the fork as it stands, because the overlay overwrites the evidence: a marketing fonts module here now is the fork's own (that path is fork-excluded, so the overlay never supplies one), and the skills snapshot is how reconcile tells a customized skill from a pristine one.
  const forkOwnsMarketingFonts = ownsMarketingFonts(target)
  const skillsBefore = snapshotSkills(target)
  let skills: SkillReconcile = emptyReconcile()

  // Run overlay + reconcile atomically; withRollback resets to the pre-sync commit on any failure.
  await withRollback(
    target,
    yellow("Sync failed; rolled the working tree back to your last commit."),
    async () => {
      await overlayZerostarter(target)
      // Reconcile files the overlay re-added that mix shared + author-only code (fonts.ts, navbar).
      fixDangling(target, forkOwnsMarketingFonts)
      // gitpick never copies the ignore file, but drop any that slipped through.
      remove(join(target, ".gitpickignore"))
      // Re-merge every fork manifest: starter's latest + the fork's extra deps, and the root's identity.
      for (const [path, forkPkg] of forkPkgs) {
        if (!exists(path)) continue
        writeJson(path, mergePkg(forkPkg, readJson<Pkg>(path), path === rootPkg))
      }
      // Those merges carry the starter's portless dev-URL names back in, so re-apply the fork's; otherwise a synced fork serves zerostarter.localhost again and collides with every other fork on the machine.
      rebrandPortlessFromRoot(target)
      // Rebrand the overlaid skills to the fork: the overlay re-added upstream SKILL.md files naming "zerostarter", so re-run init's reconcile, sourcing the fork name from the just-restored root package.json. The snapshot restores every skill the fork owns or has customized.
      skills = reconcileForkSkillsFromRoot(target, skillsBefore)
      // Restore the fork-owned local files the .gitpickignore directive names (favicon, audit record).
      await gitRestore(target, preserve)
    },
  )

  logStep("Overlaid the latest ZeroStarter (content, public/marketing, and branding preserved)")

  await bunInstall(target)

  // The skills tables list what this reconcile left in place, so regenerate them from the fork's own skills.
  await regenerateSkillTables(target)

  if (missingSkillTableMarkers(target)) {
    logWarn(
      "Your AGENTS.md has no skills-table markers, so the pre-commit hook that fills them fails.",
      [
        "Add these two pairs under a ## Skills heading, then commit:",
        "<!-- skills:custom -->  <!-- /skills:custom -->",
        "<!-- skills:vendored -->  <!-- /skills:vendored -->",
      ],
    )
  }

  const skillFiles = (names: string[]) => names.map((name) => `.agents/skills/${name}/SKILL.md`)
  const plural = (names: string[]) => (names.length === 1 ? "" : "s")

  if (skills.forkOwned.length > 0) {
    logStep(
      `Left ${skills.forkOwned.length} skill${plural(skills.forkOwned)} you own untouched:`,
      skillFiles(skills.forkOwned),
    )
  }

  if (skills.customized.length > 0) {
    logWarn(
      `Kept your edits to ${skills.customized.length} skill${plural(skills.customized)}, so they did not take the update:`,
      skillFiles(skills.customized),
    )
    logStep("To take upstream's version instead, delete the skill directory and sync again.")
  }

  // A fork synced before the CLI started recording what it wrote has nothing to compare against, so these took the update on a guess. Naming them is the difference between a reviewable diff and a silent loss.
  if (skills.unverified.length > 0) {
    logWarn(
      `Updated ${skills.unverified.length} skill${plural(skills.unverified)} with no sync record, so any edits of yours are in the diff rather than the file:`,
      skillFiles(skills.unverified),
    )
    logStep(
      "Restore any with: git restore --source=HEAD -- .agents/skills/<name>/SKILL.md. Later syncs track them.",
    )
  }

  note(
    [
      "Starter files were updated (edits overwritten); your content, public/marketing, branding, and the skills you own were preserved.",
      yellow(`Review the diff and commit: git -C ${target} status`),
    ].join("\n"),
    "Review the changes",
  )
  outro(orange("Synced to the latest ZeroStarter"))
}
