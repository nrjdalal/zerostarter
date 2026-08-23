# Audit: `node:` built-ins that can move to `Bun.*` (2026-08-23)

Scope: every `node:` import in the repo, judged against the `runtime-apis` rule (Bun-first where the file runs only under Bun, `node:` everywhere else) with Bun 1.4.0's own API docs (`bun.com/llms-full.txt`, fetched 2026-08-23) as the reference for what a Bun equivalent is. Read-only: this doc records the findings; the migration itself is a separate, small PR.

Method: the inventory command from the skill, `rg -n "from ['\"]node:..." --hidden`, over the tree at `660f0c6a` (Bun 1.4 merged), then each Bun-only file read in full. The per-file inventory lives in `.agents/skills/runtime-apis/index.md`, regenerated in this change (it was a 2026-07-26 snapshot missing six newer files).

## Runtime map

33 files import a `node:` built-in. The runtime, not the module, decides what may move:

| Runtime | Files                                                                                        | Rule                                                                                                           |
| ------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Node    | 13: `packages/cli/**` (12), `.github/workflows/auto-labeler.yml`                             | `node:` only. The CLI runs under `npx`; the workflow under `actions/github-script`.                            |
| Both    | 3: `packages/env/src/lib/utils.ts`, `web/next/next.config.ts`, `web/next/src/app/layout.tsx` | `node:` only. `web/next` runs under the system Node in `next dev` and under Bun in Docker and on Vercel.       |
| Build   | 2: `packages/auth/tsdown.config.ts`, `packages/env/tsdown.config.ts`                         | `node:` only. tsdown runs under whichever `node` is on PATH: Node locally, Bun's shim in the `oven/bun` image. |
| Bun     | 15: 5 in `.github/scripts/`, 2 in `packages/scripts/src/`, 8 tests under `tests/`            | May move a call to `Bun.*` where one exists.                                                                   |

`api/hono` imports no `node:` built-in at all; its Node-shaped surface is npm packages (see "Adjacent").

## Findings on the 15 Bun-only files

### Migrate (2 files, 5 call sites)

| File                                        | Call                                                                                | Bun equivalent                                                                                                         | Notes                                                                                                                                                                                    |
| ------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.github/scripts/ensure-remote-branches.ts` | `execFileSync("git", args, { encoding, stdio })` in the `git()` helper              | `Bun.spawnSync(["git", ...args], { stdin: "ignore", stdout: "pipe", stderr: "pipe" })` then `stdout.toString().trim()` | `execFileSync` throws on a non-zero exit and `done()` relies on that; `spawnSync` does not throw, so the helper must `throw` on `exitCode !== 0` to keep the `try/catch` callers intact. |
| `.github/scripts/ensure-remote-branches.ts` | `execFileSync("git", ["push", ...], { stdio: inherit })`                            | `Bun.spawnSync([...], { stdin: "ignore", stdout: "inherit", stderr: "inherit" })` with an `exitCode` check             | Same non-throwing caveat; the failure branch prints the manual `git push` hint and must still run.                                                                                       |
| `.github/scripts/shadcn-customize.ts`       | `execFileSync("git", ["checkout", "HEAD", "--", ...RESTORE], { stdio: "inherit" })` | `Bun.spawnSync` with inherited stdio and an `exitCode` check                                                           | A failed restore must abort the script as it does today.                                                                                                                                 |
| `.github/scripts/shadcn-customize.ts`       | `readFileSync(GLOBALS, "utf8")`                                                     | `await Bun.file(GLOBALS).text()`                                                                                       | `patchGlobals()` becomes `async`; the top-level call gains `await` (fine at module top level under Bun).                                                                                 |
| `.github/scripts/shadcn-customize.ts`       | `writeFileSync(GLOBALS, css)`                                                       | `await Bun.write(GLOBALS, css)`                                                                                        | Same function.                                                                                                                                                                           |

Both were already listed as convertible in the July index, so this is known debt rather than a new find. The July note kept `ensure-remote-branches.ts` on `node:child_process` because it ships to forks through `lefthook.yml`; that hook runs it as `bun .github/scripts/ensure-remote-branches.ts`, so Bun is guaranteed in a fork too and portability is not exercised. `Bun.$` (the shell) would read even shorter, but it is async and throws `ShellError`, which would ripple `async` through the whole hook; `spawnSync` keeps the script's shape. Net change is about twenty lines and drops two `node:` imports.

### Keep, deliberately (1 file)

`.github/scripts/skills-manager.ts` hashes skill files with `createHash("sha256")` from `node:crypto`. `new Bun.CryptoHasher("sha256").update(text).digest("hex")` produces the identical digest, so the shared `.sync.json` ledger would not notice. It stays because the helper is a line-for-line mirror of the CLI's `digest()` in `packages/cli/src/skills.ts` (Node, cannot move), and one line in two places is easier to keep in lockstep than two implementations of the same ledger key.

### Keep, no Bun equivalent (every remaining call)

| Module                                         | Calls in Bun-only files                                                                                                         | Why it stays                                                                                                                                                                                                                           |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node:path`                                    | `join`, `resolve`, `dirname` in 5 of the 7 scripts and all 8 tests                                                              | Bun ships no path module; its docs list only `Bun.fileURLToPath` / `Bun.pathToFileURL` under "URL & Path Utilities" and mark `node:path` fully implemented.                                                                            |
| `node:fs` (directory half)                     | `mkdirSync`, `mkdtempSync`, `readdirSync`, `rmSync` in the CLI tests                                                            | Bun's file docs: "for operations they don't cover, such as `mkdir` or `readdir`, use Bun's nearly complete implementation of `node:fs`". `Bun.file().delete()` covers one file, not a tree.                                            |
| `node:os`                                      | `tmpdir` in the CLI tests                                                                                                       | No Bun equivalent.                                                                                                                                                                                                                     |
| `node:fs` (file half) and `node:child_process` | `readFileSync`, `writeFileSync`, `existsSync` across the CLI tests; `execFileSync` in `tests/packages/cli/src/{git,io}.test.ts` | These do have Bun equivalents (`Bun.file().text()`, `Bun.write`, `Bun.file().exists()`, `Bun.spawnSync`), but the CLI tests mirror the CLI's `node:` style on purpose (skill rule), so their helpers stay with the code they exercise. |

`util.parseArgs` (CLI), `node:readline/promises` (CLI) and `node:fs/promises` `access` (vendored `nano-spawn`) are all in Node-runtime files; Bun's own docs point `argv` parsing at `util.parseArgs` anyway, so there is nothing to move even if they were not.

The `Bun.file` / `Bun.write` / `Bun.Glob` / `Bun.YAML` surface is already the norm in the Bun-only scripts (`docs.ts`, `compress-images.ts`, `data-table-metrics.ts`, `generate-env.ts`, `skills-manager.ts` use nothing else for I/O), which is why the convertible list is this short.

## Adjacent, outside the `node:` scope

Checked because "move to Bun" naturally raises them; none is a `node:` import and none is recommended now.

- **`@hono/node-server` + `ws` on Vercel** (`api/hono`): the api selects the Node adapter when `process.env.VERCEL` is set because Vercel Functions do not run `Bun.serve()` and the Hono/Bun WebSocket upgrade did not work there (#674). That finding predates the api's move to Vercel's Bun runtime; worth a one-preview re-verification of the upgrade path before any change, and nothing to do if it still holds.
- **`postgres` driver vs `Bun.SQL`** (`packages/db`): blocked. The package is imported by `web/next`, which runs under Node in `next dev`, so a Bun-only driver cannot replace it.
- **`sharp` vs `Bun.Image`** (`compress-images.ts`): measured on the repo's two PNGs. `Bun.Image`'s lossless PNG output is 63% and 161% larger than sharp's `effort: 10` output, and it cannot encode AVIF or HEIC on Linux (CI and the Docker builder). Not a replacement today; revisit when Bun's PNG encoder gains an effort setting.

## Drift fixed here

`.agents/skills/runtime-apis/index.md` was a 2026-07-26 snapshot: it lacked six files (`skills-manager.ts`, `packages/cli/src/skills.ts` and four newer tests) and still classed `web/next` as Node. Regenerated from the current tree with `web/next` as Both, and the convertible section updated to these findings.

## Recommendation

One small PR: migrate the two scripts above, run `bun run test` (the `ensure-remote-branches` unit tests cover its exported helpers; the `git()` wrapper is exercised by a real pre-push) and `bun run shadcn:update` end to end (the customize script only runs inside that sync), then delete this file, since its findings are either shipped or recorded as deliberate keeps in the index.
