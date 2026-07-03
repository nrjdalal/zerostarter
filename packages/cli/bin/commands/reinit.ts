import { basename, join, resolve } from "node:path"
import { parseArgs } from "node:util"

import { convertRepo } from "@/convert"
import { hasPostgresUrl, seedEnv } from "@/db"
import { bunInstall, gitCommitAll, gitIsClean, gitResetHard, overlayZerostarter } from "@/git"
import { emptyDir, exists } from "@/io"

import { green, isInteractive, orange, promptConfirm, yellow } from "./_prompt"

const helpMessage = `Usage:
  $ bunx zerostarter reinit [dir] [options]

Re-scaffold an existing git repo (default .) as a fresh ZeroStarter: delete every
file (keeping .git and your .env* files, so history, remote, and secrets survive), fetch the
latest ZeroStarter, and rebrand to the dir name. The commit lands on the current
branch; push when ready.

Options:
  -y, --yes      Skip the confirmation prompt
  -h, --help     Display help`

export const reinit = async (argv: string[]) => {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    args: argv,
    options: {
      help: { short: "h", type: "boolean" },
      yes: { short: "y", type: "boolean" },
    },
  })

  if (values.help) {
    console.log(helpMessage)
    return
  }

  const target = resolve(positionals[0] ?? ".")
  const name = basename(target)
  const interactive = isInteractive() && !values.yes

  if (!exists(join(target, ".git"))) {
    throw new Error(
      `No git repository in ${target}. reinit re-scaffolds an existing repo; use init for a new project.`,
    )
  }
  // Only committed files are recoverable from .git after the wipe, so refuse a dirty tree.
  if (!gitIsClean(target)) {
    throw new Error(
      "Working tree has uncommitted changes. Commit or stash them first; reinit deletes every tracked file.",
    )
  }

  if (interactive) {
    const ok = await promptConfirm(
      yellow(`Delete every file in ${target} (keeping .git and .env*) and re-scaffold as ${name}?`),
      false,
    )
    if (!ok) {
      console.log("Aborted.")
      return
    }
  }

  console.log()
  console.log("Removing all files (keeping .git and your .env* files) ...")

  // Wipe + re-fetch + rebrand atomically; roll back to the pre-reinit commit on any failure (commit runs last).
  try {
    emptyDir(target)

    console.log("Fetching the latest ZeroStarter ...")
    overlayZerostarter(target)

    console.log("Rebranding ...")
    convertRepo(target, { name })

    console.log("Installing dependencies ...")
    bunInstall(target)

    seedEnv(target)
    gitCommitAll(target, `ci(reinit): re-baseline as ${name}`)
  } catch (err) {
    gitResetHard(target)
    console.log(yellow("reinit failed; rolled the repo back to your last commit."))
    throw err
  }

  console.log(
    `\n${green("✓")} ${name} re-scaffolded; .git history, remote, and .env* files are intact.`,
  )
  console.log("Next steps:")
  if (!hasPostgresUrl(target)) {
    console.log(`  ${orange("set POSTGRES_URL in .env")}  # your Postgres connection string`)
    console.log(`  ${orange("bun run db:migrate")}`)
  }
  console.log(`  ${orange("bun run dev")}`)
  console.log(`  ${orange("git push")}  # to your existing remote`)
}
