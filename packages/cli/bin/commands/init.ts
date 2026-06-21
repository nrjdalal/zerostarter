import { existsSync, readdirSync } from "node:fs"
import { basename, join, resolve } from "node:path"
import { parseArgs } from "node:util"

import { convertRepo } from "@/convert"
import { bunInstall, fetchZerostarter, gitCommitAll, gitInit } from "@/git"
import { exists } from "@/io"

import { green, isInteractive, orange, promptConfirm, promptText, yellow } from "./_prompt"

const helpMessage = `Usage:
  $ zerostarter init [dir] [options]

Scaffold ZeroStarter into dir (default .) as a fresh product. The author's
content, public assets, and agent skills are left out for you to supply; the
dir name becomes the project name and site.ts + package.json are rebranded. If
the dir already holds a ZeroStarter clone it is used in place; otherwise the
latest ZeroStarter is fetched into it first.

Options:
  -y, --yes      Skip prompts; fail instead of prompting when input is needed
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
      "dry-run": { type: "boolean" },
      help: { short: "h", type: "boolean" },
      yes: { short: "y", type: "boolean" },
    },
  })

  if (values.help) {
    console.log(helpMessage)
    return
  }

  const interactive = isInteractive() && !values.yes

  let dir = positionals[0] ?? "."
  const firstTarget = resolve(dir)
  const convertInPlace = isZerostarter(firstTarget)

  if (!convertInPlace && !isEmptyDir(firstTarget)) {
    if (!interactive) {
      throw new Error(
        "Target directory is not empty. Pass an empty target dir, for example: zerostarter init my-product",
      )
    }
    const answer = await promptText("Target directory is not empty. New project directory")
    if (!answer) throw new Error("No directory name provided.")
    dir = answer
  }

  const target = resolve(dir)
  const name = basename(target)
  const brand = { name }

  if (values["dry-run"]) {
    console.log("zerostarter init (dry run)")
    console.log(`  target: ${target}`)
    console.log(`  name:   ${name}`)
    console.log(`  mode:   ${isZerostarter(target) ? "in place" : "fetch first"}`)
    return
  }

  if (convertInPlace && interactive) {
    const ok = await promptConfirm(
      yellow(`Convert ${target} in place? This rewrites files and commits.`),
      false,
    )
    if (!ok) {
      console.log("Aborted.")
      return
    }
  }

  if (!isZerostarter(target)) {
    console.log("Fetching the latest ZeroStarter ...")
    fetchZerostarter(target)
  }

  // Story mode: commit the pristine starter first (fresh repos only), so the
  // conversion lands as its own reviewable "re-baseline" diff on top.
  if (!exists(join(target, ".git"))) {
    gitInit(target)
    gitCommitAll(target, "chore: scaffold from zerostarter")
  }

  console.log("Removing starter content and rebranding ...")
  convertRepo(target, brand)

  console.log("Installing dependencies ...")
  bunInstall(target)

  gitCommitAll(target, `chore: re-baseline as ${name}`)

  const tips: [string, string][] = [
    ["packages/config/src/site.ts", "your brand: name, tagline, links"],
    ["web/next/content", "your docs and blog"],
    ["web/next/public", "your logo and assets"],
  ]

  console.log(`\n${green("✓")} ${name} is ready.\n`)
  console.log("Next steps:")
  if (target !== process.cwd()) console.log(`  ${orange(`cd ${dir}`)}`)
  console.log(`  ${orange("cp .env.example .env")}  # add your secrets`)
  console.log(`  ${orange("bun dev")}`)
  console.log("\nMake it yours:")
  for (const [path, desc] of tips) console.log(`  ${path.padEnd(29)} ${desc}`)
}
