import { homedir } from "node:os"
import { delimiter, join } from "node:path"

import { bunAvailable } from "@/git"
import { bunInstallCommand, detectRunner, zerostarterCommand } from "@/runner"
import { runLive } from "@/spawn"

import { isInteractive, orange, promptConfirm, red } from "./_prompt"

// Where the official installer drops bun: $BUN_INSTALL/bin, default ~/.bun/bin (%USERPROFILE%\.bun\bin on Windows). The installer edits the shell rc, not this process's PATH.
const bunBinDir = (): string => join(process.env.BUN_INSTALL || join(homedir(), ".bun"), "bin")

// Guarantee bun before a command shells out to it (bunx gitpick, bunx pglaunch). Reuses bunAvailable's runtime/user-agent detection so real bun users are never wrongly blocked (a bare `bun --version` can misfire, notably on Windows). When bun is genuinely missing, show how to re-run under bun and offer to install it via the official installer. `yes` opts into the install; a non-interactive run without `yes` prints the guidance and exits rather than running a remote installer unprompted.
export const ensureBun = async (yes = false): Promise<void> => {
  if (bunAvailable()) return

  const runner = detectRunner()
  const rerun = `bunx --bun ${zerostarterCommand()}`
  console.error(
    red(
      `Seems like you are using ${runner === "unknown" ? "npx/pnpx" : runner} or Windows, try using:`,
    ),
  )
  console.error(orange(`  ${rerun}`))
  console.error("")

  const install =
    yes || (isInteractive() && (await promptConfirm("Or install bun now and continue?", true)))
  if (install) {
    const { cmd, args } = bunInstallCommand()
    console.error("Installing bun from https://bun.sh/install ...")
    try {
      runLive(cmd, args)
      // The installer never touches this process's PATH, so add its bin dir to use the just-installed bun in this same run.
      process.env.PATH = `${bunBinDir()}${delimiter}${process.env.PATH || ""}`
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
