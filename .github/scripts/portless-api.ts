// Launches the api under an explicit, api-first portless name so a worktree resolves at
// api.<branch>.<web>.localhost, matching the deployed api.<env> layout. portless's explicit-name
// mode (`portless <name> <cmd>`) does not apply the worktree branch prefix, so we take the web
// app's already-prefixed host from `portless get` (which uses portless's own worktree
// sanitization) and prepend `api.`. PORTLESS=0 skips all of this (fixed ports, no proxy).

export {} // makes this a module so the top-level await type-checks

const cmd = process.argv.slice(2)
if (cmd.length === 0) {
  console.error("portless-api: no command given")
  process.exit(1)
}

const run = (args: string[]) => {
  const proc = Bun.spawn(args, { env: process.env, stdio: ["inherit", "inherit", "inherit"] })
  const stop = () => proc.kill()
  process.on("SIGINT", stop)
  process.on("SIGTERM", stop)
  return proc
}

if (process.env.PORTLESS === "0") {
  process.exit((await run(cmd).exited) ?? 1)
}

// api.<web> -> <web>; convert.ts rebrands `portless.name` for forks, so this stays in sync.
const { portless } = await Bun.file("package.json").json()
const webName = String(portless?.name ?? "api").replace(/^api\./, "")

const got = Bun.spawnSync(["portless", "get", webName], { env: process.env, stdout: "pipe" })
const webUrl = new TextDecoder().decode(got.stdout).trim()
if (!webUrl) {
  console.error(`portless-api: could not resolve the web URL via \`portless get ${webName}\``)
  process.exit(1)
}
const nameLabels = new URL(webUrl).hostname.split(".").slice(0, -1)
const apiName = ["api", ...nameLabels].join(".")

process.exit((await run(["portless", apiName, ...cmd]).exited) ?? 1)
