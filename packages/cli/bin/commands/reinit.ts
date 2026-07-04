import { basename, resolve } from "node:path"
import { parseArgs } from "node:util"

import { convertRepo } from "@/convert"
import { hasPostgresUrl, seedEnv } from "@/db"
import { bunInstall, gitCommitAll, overlayZerostarter, requireCleanRepo, withRollback } from "@/git"
import { emptyDir } from "@/io"

import { ensureBun } from "./_bun"
import {
  cancel,
  cyan,
  green,
  intro,
  isInteractive,
  logStep,
  orange,
  outro,
  promptConfirm,
  yellow,
} from "./_prompt"

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

  await ensureBun(Boolean(values.yes))

  const target = resolve(positionals[0] ?? ".")
  const name = basename(target)
  const interactive = isInteractive() && !values.yes

  // Only committed files are recoverable from .git after the wipe, so refuse a dirty tree.
  await requireCleanRepo(
    target,
    `No git repository in ${target}. reinit re-scaffolds an existing repo; use init for a new project.`,
    "Working tree has uncommitted changes. Commit or stash them first; reinit deletes every tracked file.",
  )

  intro(cyan("https://zerostarter.dev"))

  if (interactive) {
    const ok = await promptConfirm(
      `Delete every file in ${name} (keeping .git and .env*) and re-scaffold?`,
      false,
    )
    if (!ok) {
      cancel("Aborted")
      return
    }
  }

  // Wipe + re-fetch + rebrand atomically; withRollback resets to the pre-reinit commit on any failure.
  await withRollback(
    target,
    yellow(
      "reinit failed; restored your committed files (deleted gitignored files, except .env*, are gone).",
    ),
    async () => {
      emptyDir(target)
      await overlayZerostarter(target)
      logStep("Fetched the latest ZeroStarter (kept .git and .env*)")
      convertRepo(target, { name })
      logStep(`Rebranded to ${name}`)
      await bunInstall(target)
      seedEnv(target)
      await gitCommitAll(target, `ci(reinit): re-baseline as ${name}`)
    },
  )

  outro(green(`${name} re-scaffolded; .git history, remote, and .env* files are intact`))
  console.log()
  console.log("Next steps:")
  if (!hasPostgresUrl(target)) {
    console.log(`  ${orange("set POSTGRES_URL in .env")}  # your Postgres connection string`)
  }
  console.log(`  ${orange("bun run db:migrate")}`)
  console.log(`  ${orange("bun run dev")}`)
  console.log(`  ${orange("git push")}  # to your existing remote`)
}
