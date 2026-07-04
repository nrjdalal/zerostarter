import { parseArgs, type ParseArgsConfig } from "node:util"

import { red } from "@/style"

// parseArgs, but a bad flag (unknown option, missing value) prints the command's help and exits cleanly (code 1) instead of throwing a raw Node error the top-level handler would surface without any usage. The return type is inferred from `config`, so callers keep parseArgs's precise `values`/`positionals` typing.
export const parseArgsOrExit = <T extends ParseArgsConfig>(help: string, config: T) => {
  try {
    return parseArgs(config)
  } catch (err) {
    process.stderr.write(`${red(err instanceof Error ? err.message : String(err))}\n\n`)
    process.stdout.write(`${help}\n`)
    process.exit(1)
  }
}
