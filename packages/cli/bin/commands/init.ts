import { existsSync, readdirSync } from "node:fs"
import { basename, join, resolve } from "node:path"
import { parseArgs } from "node:util"

import { convertRepo } from "@/convert"
import { fetchZerostarter, gitCommitAll, gitInit } from "@/git"
import { exists } from "@/io"

import { promptConfirm, promptText } from "./_prompt"

const helpMessage = `Usage:
  $ zerostarter init [dir] [options]

Scaffold zerostarter into dir (default .) as a fresh product. The author's
content, public assets, and agent skills are left out for you to supply; the
dir name becomes the project name and site.ts + package.json are rebranded. If
the dir already holds a zerostarter clone it is used in place; otherwise the
latest zerostarter is fetched into it first.

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

  const interactive = Boolean(process.stdout.isTTY) && !values.yes

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
      `Convert ${target} in place? This rewrites files and commits.`,
      false,
    )
    if (!ok) {
      console.log("Aborted.")
      return
    }
  }

  if (!isZerostarter(target)) {
    console.log(`Fetching zerostarter into ${target} ...`)
    fetchZerostarter(target)
  }

  // Story mode: commit the pristine starter first (fresh repos only), so the
  // conversion lands as its own reviewable "re-baseline" diff on top.
  if (!exists(join(target, ".git"))) {
    gitInit(target)
    gitCommitAll(target, "chore: scaffold from zerostarter")
  }

  console.log("Removing the author's content, assets, and skills and rebranding ...")
  convertRepo(target, brand)

  gitCommitAll(target, `chore: re-baseline as ${name}`)

  console.log("\nDone. Next steps:")
  console.log(`  cd ${dir}`)
  console.log("  bun install")
  console.log("  cp .env.example .env   # then set your values")
  console.log("  bun dev")
  console.log("\n  # then make it yours:")
  console.log("  #   packages/config/src/site.ts  set the description and tagline")
  console.log("  #   web/next/content             replace the docs/blog stub")
  console.log("  #   web/next/public              add your assets")
}
