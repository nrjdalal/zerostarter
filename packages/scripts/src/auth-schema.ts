import { dirname, join } from "node:path"

// Regenerate packages/db/src/schema/auth.ts with the auth CLI, so the file is exactly what Better Auth's own generator emits for the declared plugins and columns, and never carries a hand edit. The CLI runs under Node on purpose: under Bun, Function.prototype.toString drops the call in "() => new Date()", which is the text the generator tests before emitting a database default, so a Bun run silently loses every .defaultNow(). --check regenerates to a scratch file and fails when the committed file differs.
const scripts = dirname(import.meta.dirname)
const target = join(scripts, "../db/src/schema/auth.ts")
const config = join(import.meta.dirname, "auth-schema.config.ts")
const check = process.argv.includes("--check")
const scratch = join(import.meta.dirname, ".auth-schema.generated.ts")

const run = async (cmd: string[], cwd: string, stdin?: string): Promise<string> => {
  const proc = Bun.spawn(cmd, {
    cwd,
    stdin: stdin === undefined ? "ignore" : new Blob([stdin]),
    stdout: "pipe",
    stderr: "pipe",
  })
  const [out, err, status] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])
  if (status !== 0) throw new Error(`${cmd.join(" ")} failed (${status}):\n${err || out}`)
  return out
}

await run(["bunx", "auth", "generate", "--config", config, "--output", scratch, "-y"], scripts)
const generated = await run(
  ["bunx", "oxfmt", "--stdin-filepath", target],
  scripts,
  await Bun.file(scratch).text(),
)
await Bun.file(scratch).delete()

const current = (await Bun.file(target).exists()) ? await Bun.file(target).text() : ""
if (check) {
  if (generated !== current) {
    console.error(
      "packages/db/src/schema/auth.ts is not what the generator emits; run: bun run auth:schema",
    )
    process.exit(1)
  }
  console.log("auth schema is in sync")
} else {
  await Bun.write(target, generated)
  console.log(`wrote ${target}`)
}
