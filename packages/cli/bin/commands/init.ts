import { existsSync, readdirSync } from "node:fs"
import { basename, resolve } from "node:path"
import { parseArgs } from "node:util"

import { promptText } from "./_prompt"

const helpMessage = `Usage:
  $ zerostarter init [dir] [options]

Scaffold zerostarter into dir (default .) and convert it into a clean product.
The dir name becomes the project name; everything else is left as a placeholder
to fill in later.

Options:
  -y, --yes      Skip prompts; fail instead of prompting when input is needed
      --dry-run  Print the plan without writing anything
  -h, --help     Display help`

const isEmptyDir = (dir: string): boolean => {
  if (!existsSync(dir)) return true
  return readdirSync(dir).filter((f) => f !== ".git").length === 0
}

export const init = async (argv: string[]) => {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      yes: { type: "boolean", short: "y" },
      "dry-run": { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  })

  if (values.help) {
    console.log(helpMessage)
    return
  }

  const interactive = Boolean(process.stdout.isTTY) && !values.yes

  let dir = positionals[0] ?? "."

  // Guard a non-empty current dir: prompt for a dir name rather than scaffolding over existing files.
  if (dir === "." && !isEmptyDir(".")) {
    if (!interactive) {
      throw new Error(
        "Current directory is not empty. Pass a target dir, for example: zerostarter init my-product",
      )
    }
    const answer = await promptText("Current directory is not empty. New project directory")
    if (!answer) throw new Error("No directory name provided.")
    dir = answer
  }

  const target = resolve(dir)
  const projectName = basename(target)

  // TODO(P1+): fetch zerostarter into the target, then run the conversion engine.
  console.log(`zerostarter init${values["dry-run"] ? " (dry run)" : ""}`)
  console.log(`  target: ${target}`)
  console.log(`  name:   ${projectName}`)
  console.log(`  engine: not implemented yet (P0 skeleton)`)
}
