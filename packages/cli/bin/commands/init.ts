import { existsSync, readdirSync, readFileSync } from "node:fs"
import { basename, dirname, join, parse, resolve } from "node:path"

import { convertRepo } from "@/convert"
import { dockerRunning, hasPostgresUrl, provisionDatabase, seedEnv } from "@/db"
import { bunInstall, fetchZerostarter, gitBranch, gitCommitAll, gitInit } from "@/git"
import { exists } from "@/io"
import { DEFAULT_FEATURES, type FeatureFlags } from "@/templates"

import { parseArgsOrExit } from "./_args"
import { ensureBun } from "./_bun"
import {
  cancel,
  intro,
  isInteractive,
  link,
  logSuccess,
  logWarn,
  note,
  orange,
  outro,
  promptConfirm,
  promptMultiselect,
  promptText,
  withSpinner,
} from "./_prompt"

// The optional surfaces init can toggle, their CLI flags (--<flag> / --no-<flag>), and prompt labels. Alphabetical, to match the config's features export. Kept in lockstep with @packages/config/site's `features` by test/features-consistency.test.ts.
export const FEATURE_DEFS = [
  { value: "allowlist", flag: "allowlist", label: "Allowlist (grant console access by domain)" },
  { value: "apiDocs", flag: "api-docs", label: "API docs" },
  { value: "blog", flag: "blog", label: "Blog" },
  { value: "docs", flag: "docs", label: "Docs" },
  { value: "internalDocs", flag: "internal-docs", label: "Internal (console) docs" },
  { value: "waitlist", flag: "waitlist", label: "Waitlist (else a plain landing home)" },
] as const

const helpMessage = `Usage:
  $ bunx zerostarter init [dir] [options]

Scaffold ZeroStarter into dir (default .) as a fresh product. The author's
content and public assets are left out for you to supply; the
dir name becomes the project name and site.ts + package.json are rebranded. If
the dir already holds a ZeroStarter clone it is used in place; otherwise the
latest ZeroStarter is fetched into it first.

Options:
  -y, --yes      Skip prompts, taking defaults (provisions Postgres when Docker is running)
      --canary   Scaffold from the canary branch instead of main (for testing)
      --db       Provision a local Postgres (pglaunch) and migrate; needs Docker
      --dry-run  Print the plan without writing anything
  -h, --help     Display help

Features (default on, except the waitlist; pass any flag to skip the interactive picker):
      --api-docs,       --no-api-docs        The /api/docs API reference
      --blog,           --no-blog            The /blog
      --docs,           --no-docs            The /docs
      --internal-docs,  --no-internal-docs   The /console/docs internal docs
      --waitlist,       --no-waitlist        The /waitlist (off leaves a plain landing home)`

const isEmptyDir = (dir: string): boolean =>
  !existsSync(dir) || readdirSync(dir).filter((f) => f !== ".git").length === 0

const isZerostarter = (dir: string): boolean => exists(join(dir, "packages/config/src/site.ts"))

// `dir` or the nearest ancestor that is a bun workspace root (a lockfile, or a package.json with `workspaces`), or null. Pass the directory bun install would run under; if any level up is a workspace root, bun climbs into it and fails to resolve the new project's own workspace deps.
const insideExistingProject = (dir: string): string | null => {
  let cur = dir
  const { root } = parse(cur)
  while (true) {
    if (existsSync(join(cur, "bun.lock")) || existsSync(join(cur, "bun.lockb"))) return cur
    const pkg = join(cur, "package.json")
    if (existsSync(pkg)) {
      try {
        if (JSON.parse(readFileSync(pkg, "utf8")).workspaces) return cur
      } catch {
        // unreadable manifest; keep walking up
      }
    }
    if (cur === root) return null
    cur = dirname(cur)
  }
}

export const init = async (argv: string[]) => {
  const { positionals, values } = parseArgsOrExit(helpMessage, {
    allowPositionals: true,
    args: argv,
    options: {
      canary: { type: "boolean" },
      db: { type: "boolean" },
      "dry-run": { type: "boolean" },
      help: { short: "h", type: "boolean" },
      yes: { short: "y", type: "boolean" },
      "api-docs": { type: "boolean" },
      "no-api-docs": { type: "boolean" },
      blog: { type: "boolean" },
      "no-blog": { type: "boolean" },
      docs: { type: "boolean" },
      "no-docs": { type: "boolean" },
      "internal-docs": { type: "boolean" },
      "no-internal-docs": { type: "boolean" },
      waitlist: { type: "boolean" },
      "no-waitlist": { type: "boolean" },
    },
  })

  if (values.help) {
    console.log(helpMessage)
    return
  }

  // Fail fast if Bun is missing (offer to install it), before any prompt; --dry-run only prints the plan, so let it run without Bun.
  if (!values["dry-run"]) await ensureBun(Boolean(values.yes))

  const interactive = isInteractive() && !values.yes
  // Which starter branch to scaffold from: main (stable) by default, canary for testing unreleased changes.
  const ref = values.canary ? "canary" : "main"

  // Resolve the feature set from flags over the fork defaults: --no-<flag> wins, then --<flag>, else the default. Passing any feature flag (or --yes) skips the interactive picker.
  const flags = values as Record<string, boolean | undefined>
  const anyFeatureFlag = FEATURE_DEFS.some((f) => flags[f.flag] || flags[`no-${f.flag}`])
  const chosenFeatures: FeatureFlags = { ...DEFAULT_FEATURES }
  for (const f of FEATURE_DEFS) {
    chosenFeatures[f.value] = flags[`no-${f.flag}`]
      ? false
      : flags[f.flag]
        ? true
        : DEFAULT_FEATURES[f.value]
  }

  let dir = positionals[0] ?? "."
  const firstTarget = resolve(dir)
  const convertInPlace = isZerostarter(firstTarget)
  // A non-empty, non-clone target is scaffolded into a subdirectory of itself (after the name prompt), so bun installs one level deeper.
  const intoSubdir = !convertInPlace && !isEmptyDir(firstTarget)

  // Refuse to scaffold inside an existing workspace/repo: bun install would climb into it and fail. Check the directory bun installs under: the name-prompt path scaffolds into a subdir of the cwd (the entered name resolves against cwd, not the positional), so check cwd there; otherwise the target's parent.
  if (!convertInPlace && !values["dry-run"]) {
    const root = insideExistingProject(intoSubdir ? process.cwd() : dirname(firstTarget))
    if (root) {
      throw new Error(
        `Cannot scaffold inside an existing project (a workspace was found at ${root}). Run it in a fresh directory outside that project.`,
      )
    }
  }

  // Open the flow before any prompt so the name/convert prompts sit under the intro's gutter.
  if (!values["dry-run"]) intro(link("https://zerostarter.dev"))

  if (intoSubdir) {
    if (!interactive) {
      throw new Error(
        "Directory is not empty. Run it in an empty directory, or pass a project name: bunx zerostarter init <name>",
      )
    }
    const answer = await promptText("What should we name your project?")
    if (!answer) throw new Error("No directory name provided.")
    dir = answer
  }

  const target = resolve(dir)
  const name = basename(target)
  const brand = { name }

  const canaryInPlaceNote =
    "--canary ignored: converting the existing checkout in place, so nothing is fetched."

  const featureList = (features: FeatureFlags): string =>
    FEATURE_DEFS.filter((f) => features[f.value])
      .map((f) => f.value)
      .join(", ") || "none"

  if (values["dry-run"]) {
    console.log("bunx zerostarter init (dry run)")
    console.log(`  target:   ${target}`)
    console.log(`  name:     ${name}`)
    console.log(`  mode:     ${isZerostarter(target) ? "in place" : `fetch ${ref}`}`)
    console.log(`  features: ${featureList(chosenFeatures)}`)
    if (isZerostarter(target) && values.canary) {
      console.log(`  note:     ${canaryInPlaceNote}`)
    }
    return
  }

  if (convertInPlace && interactive) {
    const ok = await promptConfirm(
      `Convert ${name} in place? This rewrites files and commits.`,
      false,
    )
    if (!ok) {
      cancel("Aborted")
      return
    }
  }

  // Interactive picker only when no feature flag steered the choice; skipping it keeps the defaults.
  if (interactive && !anyFeatureFlag) {
    const selected = new Set(
      await promptMultiselect(
        "Which optional surfaces should this fork ship with?",
        FEATURE_DEFS.map((f) => ({
          value: f.value,
          label: f.label,
          checked: DEFAULT_FEATURES[f.value],
        })),
      ),
    )
    for (const f of FEATURE_DEFS) chosenFeatures[f.value] = selected.has(f.value)
  }

  if (!isZerostarter(target)) {
    const suffix = values.canary ? " (canary)" : ""
    await withSpinner(
      `Fetching the latest ZeroStarter${suffix}`,
      `Fetched the latest ZeroStarter${suffix}`,
      () => fetchZerostarter(target, ref),
    )
  } else if (values.canary) {
    logWarn(canaryInPlaceNote)
  }

  // Commit the pristine starter first (fresh repos only) so the conversion lands as its own diff.
  if (!exists(join(target, ".git"))) {
    await gitInit(target)
    await gitCommitAll(target, "ci(init): scaffold from zerostarter")
    // Seed `main` locally at the scaffold commit so canary leads it; the pre-push hook publishes main on the second push (canary is pushed first, so GitHub makes it the default branch).
    await gitBranch(target, "main")
  }

  await withSpinner(`Rebranding to ${name}`, `Rebranded to ${name}`, () =>
    convertRepo(target, brand, chosenFeatures),
  )

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
    wantDb = await promptConfirm("Provision a local Postgres database?", dockerUp)
  } else {
    // Non-interactive (--yes / non-TTY): take the prompt's default, provision when Docker is up.
    wantDb = dockerUp
  }
  if (wantDb && dockerUp) {
    try {
      await provisionDatabase(target)
      dbReady = true
    } catch (err) {
      if (hasPostgresUrl(target)) {
        // migrate failed after provisioning; runTail already printed the failing command's output
        logWarn("Postgres is provisioned, but the migration failed; run bun run db:migrate.")
      } else {
        // pglaunch failed before migrate, so nothing was tailed; surface its output as the cause
        const detail = err instanceof Error ? err.message.trim() : String(err)
        logWarn(
          "Database setup failed; set POSTGRES_URL in .env yourself.",
          detail
            ? detail
                .split("\n")
                .filter((l) => l.trim())
                .slice(-5)
            : [],
        )
      }
    }
  } else if (wantDb) {
    logWarn(
      "Docker isn't running, so the database wasn't provisioned. Set POSTGRES_URL in .env, or start Docker and re-run for automatic setup.",
    )
  }

  note(
    [
      `${orange("packages/config/src/site.ts")} and ${orange("web/next/content")}`,
      "to manage branding and blogs & docs respectively",
    ].join("\n"),
    "Edit and make it yours",
  )
  logSuccess(`${name} is ready`)
  const steps: string[] = []
  if (target !== process.cwd()) steps.push(orange(`cd ${dir}`))
  if (!hasPostgresUrl(target)) steps.push("set POSTGRES_URL in .env")
  if (!dbReady) steps.push(orange("bun run db:migrate"))
  steps.push(orange("bun run dev"))
  note(steps.join("\n"), "Next steps")
  outro(`Learn more ${link("https://zerostarter.dev/docs")}`)
}
