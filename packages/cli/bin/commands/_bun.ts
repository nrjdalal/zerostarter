import { bunAvailable } from "@/git"
import { bunInstallCommand, detectRunner, zerostarterCommand } from "@/runner"
import { runLive } from "@/spawn"

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
    const { cmd, args } = bunInstallCommand()
    console.error("Installing bun from https://bun.sh/install ...")
    try {
      runLive(cmd, args)
      if (bunAvailable()) return
      console.error(
        red(
          "\nbun is installed but isn't on this shell's PATH yet. Open a new terminal and re-run:",
        ),
      )
      console.error(orange(`  ${rerun}`))
    } catch {
      console.error(red("\nCould not install bun. Install it from https://bun.sh, then re-run:"))
      console.error(orange(`  ${rerun}`))
    }
  }
  process.exit(1)
}
