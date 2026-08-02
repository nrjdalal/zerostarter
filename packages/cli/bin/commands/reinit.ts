import { basename, resolve } from "node:path"

import { convertRepo } from "@/convert"
import { hasPostgresUrl, seedEnv } from "@/db"
import { bunInstall, gitCommitAll, overlayZerostarter, requireCleanRepo, withRollback } from "@/git"
import { emptyDir } from "@/io"
import { regenerateSkillTables } from "@/skills"

import { parseArgsOrExit } from "./_args"
import { ensureBun } from "./_bun"
import {
  cancel,
  green,
  intro,
  isInteractive,
  link,
  logStep,
  note,
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
  const { positionals, values } = parseArgsOrExit(helpMessage, {
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

  intro(link("https://zerostarter.dev"))

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
      // Fill the generated skills tables in the AGENTS.md the rebrand just wrote, so the commit below does not trip the pre-commit hook on empty ones.
      await regenerateSkillTables(target)
      seedEnv(target)
      await gitCommitAll(target, `ci(reinit): re-baseline as ${name}`)
    },
  )

  const steps: string[] = []
  if (!hasPostgresUrl(target)) steps.push("set POSTGRES_URL in .env")
  steps.push(orange("bun run db:migrate"))
  steps.push(orange("bun run dev"))
  steps.push(orange("git push"))
  note(steps.join("\n"), "Next steps")
  outro(green(`${name} re-scaffolded; .git history, remote, and .env* files are intact`))
}
