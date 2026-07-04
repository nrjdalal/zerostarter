import { execFileSync } from "node:child_process"

import { bunAvailable } from "@/git"
import { bunInstallCommand, detectRunner, zerostarterCommand } from "@/runner"

import { isInteractive, orange, promptConfirm, red } from "./_prompt"

// Guarantee bun before a command shells out to it (bunx gitpick, bunx pglaunch). Reuses bunAvailable's runtime/user-agent detection so real bun users are never wrongly blocked (a bare `bun --version` can misfire, notably on Windows). When bun is genuinely missing, show how to re-run under bun and offer to install it. `yes` (and non-interactive) auto-accept the install.
export const ensureBun = async (yes = false): Promise<void> => {
  if (bunAvailable()) return

  const runner = detectRunner()
  const rerun = `bunx --bun ${zerostarterCommand()}`
  const via = runner === "unknown" ? "npx/pnpx or Windows" : `${runner} or Windows`
  console.error(red(`Seems like you are using ${via}, try using:`))
  console.error(orange(`  ${rerun}`))
  console.error("")

  const install =
    yes || !isInteractive() || (await promptConfirm("Or install bun now and continue?", true))
  if (install) {
    const { cmd, args } = bunInstallCommand(runner)
    console.error(`Installing bun with \`${cmd} ${args.join(" ")}\` ...`)
    try {
      execFileSync(cmd, args, { stdio: "inherit" })
      if (bunAvailable()) return
      console.error(red("\nbun was installed but isn't on this shell's PATH yet. Re-run:"))
      console.error(orange(`  ${rerun}`))
    } catch {
      console.error(red("\nCould not install bun. Install it from https://bun.sh, then re-run:"))
      console.error(orange(`  ${rerun}`))
    }
  }
  process.exit(1)
}
