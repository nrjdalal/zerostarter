import { existsSync, readdirSync } from "node:fs"
import { basename, join, resolve } from "node:path"
import { parseArgs } from "node:util"

import { convertRepo } from "@/convert"
import { dockerRunning, hasPostgresUrl, provisionDatabase, seedEnv } from "@/db"
import { bunInstall, fetchZerostarter, gitBranch, gitCommitAll, gitInit } from "@/git"
import { exists } from "@/io"

import { ensureBun } from "./_bun"
import {
  cancel,
  cyan,
  green,
  hyperlink,
  intro,
  isInteractive,
  logStep,
  logWarn,
  note,
  orange,
  promptConfirm,
  promptText,
  yellow,
} from "./_prompt"

const helpMessage = `Usage:
  $ bunx zerostarter init [dir] [options]

Scaffold ZeroStarter into dir (default .) as a fresh product. The author's
content and public assets are left out for you to supply; the
dir name becomes the project name and site.ts + package.json are rebranded. If
the dir already holds a ZeroStarter clone it is used in place; otherwise the
latest ZeroStarter is fetched into it first.

Options:
  -y, --yes      Skip prompts, taking defaults (provisions Postgres when Docker is running)
      --db       Provision a local Postgres (pglaunch) and migrate; needs Docker
      --dry-run  Print the plan without writing anything
  -h, --help     Display help`

const isEmptyDir = (dir: string): boolean =>
  !existsSync(dir) || readdirSync(dir).filter((f) => f !== ".git").length === 0

const isZerostarter = (dir: string): boolean => exists(join(dir, "packages/config/src/site.ts"))

export const init = async (argv: string[]) => {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    args: argv,
    options: {
      db: { type: "boolean" },
      "dry-run": { type: "boolean" },
      help: { short: "h", type: "boolean" },
      yes: { short: "y", type: "boolean" },
    },
  })

  if (values.help) {
    console.log(helpMessage)
    return
  }

  // Fail fast if Bun is missing (offer to install it), before any prompt; --dry-run only prints the plan, so let it run without Bun.
  if (!values["dry-run"]) await ensureBun(Boolean(values.yes))

  const interactive = isInteractive() && !values.yes

  let dir = positionals[0] ?? "."
  const firstTarget = resolve(dir)
  const convertInPlace = isZerostarter(firstTarget)

  if (!convertInPlace && !isEmptyDir(firstTarget)) {
    if (!interactive) {
      throw new Error(
        "Directory is not empty. Run it in an empty directory, or pass a project name: bunx zerostarter init <name>",
      )
    }
    const answer = await promptText("Directory isn't empty. Project name")
    if (!answer) throw new Error("No directory name provided.")
    dir = answer
  }

  const target = resolve(dir)
  const name = basename(target)
  const brand = { name }

  if (values["dry-run"]) {
    console.log("bunx zerostarter init (dry run)")
    console.log(`  target: ${target}`)
    console.log(`  name:   ${name}`)
    console.log(`  mode:   ${isZerostarter(target) ? "in place" : "fetch first"}`)
    return
  }

  intro(cyan(hyperlink("https://zerostarter.dev")))

  if (convertInPlace && interactive) {
    const ok = await promptConfirm(
      yellow(`Convert ${target} in place? This rewrites files and commits.`),
      false,
    )
    if (!ok) {
      cancel("Aborted")
      return
    }
  }

  if (!isZerostarter(target)) {
    await fetchZerostarter(target)
    logStep("Fetched the latest ZeroStarter")
  }

  // Commit the pristine starter first (fresh repos only) so the conversion lands as its own diff.
  if (!exists(join(target, ".git"))) {
    await gitInit(target)
    await gitCommitAll(target, "ci(init): scaffold from zerostarter")
    // Seed `main` locally at the scaffold commit so canary leads it; the pre-push hook publishes main on the second push (canary is pushed first, so GitHub makes it the default branch).
    await gitBranch(target, "main")
  }

  convertRepo(target, brand)
  logStep(`Rebranded to ${name}`)

  await bunInstall(target)

  await gitCommitAll(target, `ci(init): re-baseline as ${name}`)

  seedEnv(target)

  let dbReady = false
  const dockerUp = await dockerRunning()
  const dbConfigured = hasPostgresUrl(target)
  let wantDb = false
  if (dbConfigured) {
    if (values.db) logWarn("--db ignored: POSTGRES_URL is already set in .env.")
  } else if (values.db) {
    wantDb = true
  } else if (interactive) {
    // Always ask; default to yes when Docker is up (we can provision now), no when it isn't.
    wantDb = await promptConfirm("Provision a local Postgres database now?", dockerUp)
  } else {
    // Non-interactive (--yes / non-TTY): take the prompt's default, provision when Docker is up.
    wantDb = dockerUp
  }
  if (wantDb && dockerUp) {
    try {
      await provisionDatabase(target)
      dbReady = true
    } catch (err) {
      const stderr = (err as { stderr?: unknown }).stderr
      const detail = stderr
        ? String(stderr).trim()
        : err instanceof Error
          ? err.message
          : String(err)
      if (hasPostgresUrl(target)) {
        logWarn(
          "Postgres is provisioned, but the migration failed; run bun run db:migrate.",
          detail ? [detail] : [],
        )
      } else {
        logWarn("Database setup failed; set POSTGRES_URL in .env yourself.", detail ? [detail] : [])
      }
    }
  } else if (wantDb) {
    logWarn(
      "Docker isn't running, so the database wasn't provisioned. Set POSTGRES_URL in .env, or start Docker and re-run for automatic setup.",
    )
  }

  const tips: [string, string][] = [
    ["packages/config/src/site.ts", "your brand: name, tagline, links"],
    ["web/next/content", "your docs and blog"],
  ]

  const steps: string[] = []
  if (target !== process.cwd()) steps.push(orange(`cd ${dir}`))
  if (!hasPostgresUrl(target)) steps.push(orange("set POSTGRES_URL in .env"))
  if (!dbReady) steps.push(orange("bun run db:migrate"))
  steps.push(orange("bun run dev"))
  logStep(green(`${name} is ready`))
  note(steps.join("\n"), "Next steps")

  console.log("\nPush to an empty GitHub repo when ready:")
  console.log(`  ${orange("git push origin canary")}`)
  console.log("\nMake it yours:")
  for (const [path, desc] of tips) console.log(`  ${path.padEnd(29)} ${desc}`)
  if (!dbReady) {
    console.log(
      "\nIt needs a Postgres database to run: a hosted one like Neon works, or a local Docker one (re-run with Docker running to auto-provision). OAuth and other credentials are optional.",
    )
  }
}
