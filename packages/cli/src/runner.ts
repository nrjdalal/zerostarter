// The package runner that invoked this CLI, derived from npm_config_user_agent (which npx/pnpm/yarn/bun all set). "unknown" when it is unset or unrecognized, e.g. a direct node run or a shell that did not propagate it.
export type Runner = "npx" | "pnpm dlx" | "yarn dlx" | "bunx" | "unknown"

export const detectRunner = (ua = process.env.npm_config_user_agent || ""): Runner => {
  if (ua.startsWith("bun/")) return "bunx"
  if (ua.startsWith("pnpm/")) return "pnpm dlx"
  if (ua.startsWith("yarn/")) return "yarn dlx"
  if (ua.startsWith("npm/")) return "npx"
  return "unknown"
}

// The official bun installer for the current OS (https://bun.sh/docs/installation): curl | bash on macOS/Linux, PowerShell on Windows. Unlike `npm i -g bun`, this yields a native bun/bunx (a real .exe on Windows, not a fragile .cmd shim), which is what the CLI then spawns.
export const bunInstallCommand = (
  platform: NodeJS.Platform = process.platform,
): { cmd: string; args: string[] } => {
  if (platform === "win32") {
    return { cmd: "powershell", args: ["-Command", "irm bun.sh/install.ps1 | iex"] }
  }
  return { cmd: "bash", args: ["-c", "curl -fsSL https://bun.sh/install | bash"] }
}

// Reconstruct the zerostarter command the user ran (e.g. "zerostarter init -y"), for the "re-run under bun" hint.
export const zerostarterCommand = (args: string[] = process.argv.slice(2)): string =>
  ["zerostarter", ...args].join(" ")
