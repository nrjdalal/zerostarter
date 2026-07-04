// The package runner that invoked this CLI, derived from npm_config_user_agent (which npx/pnpm/yarn/bun all set). "unknown" when it is unset or unrecognized, e.g. a direct node run or a shell that did not propagate it.
export type Runner = "npx" | "pnpm dlx" | "yarn dlx" | "bunx" | "unknown"

export const detectRunner = (ua = process.env.npm_config_user_agent || ""): Runner => {
  if (ua.startsWith("bun/")) return "bunx"
  if (ua.startsWith("pnpm/")) return "pnpm dlx"
  if (ua.startsWith("yarn/")) return "yarn dlx"
  if (ua.startsWith("npm/")) return "npx"
  return "unknown"
}

// The command that installs bun globally with the same package manager the user invoked us with; falls back to npm, which is present whenever node is.
export const bunInstallCommand = (
  runner: Runner = detectRunner(),
): { cmd: string; args: string[] } => {
  if (runner === "pnpm dlx") return { cmd: "pnpm", args: ["add", "-g", "bun"] }
  if (runner === "yarn dlx") return { cmd: "yarn", args: ["global", "add", "bun"] }
  return { cmd: "npm", args: ["install", "-g", "bun"] }
}

// Reconstruct the zerostarter command the user ran (e.g. "zerostarter init -y"), for the "re-run under bun" hint.
export const zerostarterCommand = (args: string[] = process.argv.slice(2)): string =>
  ["zerostarter", ...args].join(" ")
