# Node API index

Per-file inventory of every Node built-in used in the repo, for the [`runtime-apis`](SKILL.md) skill.
Snapshot: 2026-08-23. Regenerate with the `rg "node:..."` command in `SKILL.md`.

The `Runtime` column drives the rule: **Node**, **Both** and **Build** files stay on `node:` (no `Bun.*`);
**Bun** files may move a call to a `Bun.*` equivalent where one exists. `web/next` is **Both**: `next dev`
runs under the system Node while Docker and Vercel serve it under Bun.

| File | Runtime | `node:` modules (APIs used) |
| --- | --- | --- |
| `.github/scripts/compress-images.ts` | Bun | `node:path` (path) |
| `.github/scripts/docs.ts` | Bun | `node:path` (path) |
| `.github/scripts/skills-manager.ts` | Bun | `node:crypto` (createHash); `node:path` (path) |
| `.github/workflows/auto-labeler.yml` | Node | `node:fs`, `node:path` (via `require`, `actions/github-script`) |
| `packages/auth/tsdown.config.ts` | Build | `node:fs` (existsSync, readFileSync); `node:path` (resolve) |
| `packages/cli/bin/commands/_args.ts` | Node | `node:util` (parseArgs, ParseArgsConfig) |
| `packages/cli/bin/commands/_bun.ts` | Node | `node:os` (homedir); `node:path` (delimiter, join) |
| `packages/cli/bin/commands/_prompt.ts` | Node | `node:readline/promises` (createInterface) |
| `packages/cli/bin/commands/init.ts` | Node | `node:fs` (existsSync, readdirSync, readFileSync); `node:path` (basename, dirname, join, parse, resolve) |
| `packages/cli/bin/commands/reinit.ts` | Node | `node:path` (basename, resolve) |
| `packages/cli/bin/commands/sync.ts` | Node | `node:path` (join, resolve) |
| `packages/cli/src/convert.ts` | Node | `node:path` (join) |
| `packages/cli/src/db.ts` | Node | `node:crypto` (randomBytes); `node:path` (join) |
| `packages/cli/src/git.ts` | Node | `node:path` (join) |
| `packages/cli/src/io.ts` | Node | `node:fs` (existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync); `node:path` (dirname, join) |
| `packages/cli/src/skills.ts` | Node | `node:crypto` (createHash); `node:fs` (readdirSync); `node:path` (join) |
| `packages/cli/src/vendor/nano-spawn.ts` | Node | `node:child_process` (spawn, SpawnOptions); `node:fs/promises` (access); `node:path` (delimiter, resolve) |
| `packages/env/src/load-dotenv.ts` | Both | `node:path` (path) |
| `packages/env/tsdown.config.ts` | Build | `node:child_process` (execSync) |
| `packages/scripts/src/data-table-metrics.ts` | Bun | `node:path` (join, resolve) |
| `packages/scripts/src/generate-env.ts` | Bun | `node:path` (resolve) |
| `tests/github/scripts/ensure-remote-branches.test.ts` | Bun | `node:fs` (mkdtempSync, rmSync); `node:os` (tmpdir); `node:path` (join) |
| `tests/packages/cli/bin/commands/init.test.ts` | Bun | `node:fs` (mkdirSync, mkdtempSync, rmSync, writeFileSync); `node:os` (tmpdir); `node:path` (join) |
| `tests/packages/cli/features-consistency.test.ts` | Bun | `node:fs` (readFileSync); `node:path` (join) |
| `tests/packages/cli/src/convert.test.ts` | Bun | `node:fs` (mkdtempSync, readFileSync, rmSync); `node:os` (tmpdir); `node:path` (join) |
| `tests/packages/cli/src/db.test.ts` | Bun | `node:fs` (mkdtempSync, readFileSync, rmSync, writeFileSync); `node:os` (tmpdir); `node:path` (join) |
| `tests/packages/cli/src/fork-layout.test.ts` | Bun | `node:fs` (readFileSync); `node:path` (join) |
| `tests/packages/cli/src/git.test.ts` | Bun | `node:child_process` (execFileSync); `node:fs` (existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync); `node:os` (tmpdir); `node:path` (join) |
| `tests/packages/cli/src/io.test.ts` | Bun | `node:child_process` (execFileSync); `node:fs` (mkdirSync, mkdtempSync, rmSync, writeFileSync); `node:os` (tmpdir); `node:path` (join) |
| `tests/packages/cli/src/skills.test.ts` | Bun | `node:fs` (mkdtempSync, rmSync); `node:os` (tmpdir); `node:path` (join) |
| `web/next/next.config.ts` | Both | `node:fs` (readFileSync); `node:path` (resolve) |
| `web/next/src/app/layout.tsx` | Both | `node:fs` (existsSync); `node:path` (join) |

## Convertible to `Bun.*` (Bun-only files)

Nothing remains. The last two (`execFileSync` in `ensure-remote-branches.ts`; `execFileSync`, `readFileSync`,
`writeFileSync` in `shadcn-customize.ts`) moved to `Bun.spawnSync`, `Bun.file` and `Bun.write` in 2026-08.
What is left on a Bun-only file is `node:path`, `node:os`, or the directory half of `node:fs`, which Bun's
own docs route to `node:` ("for operations they don't cover, such as `mkdir` or `readdir`, use `node:fs`"),
plus two deliberate keeps: `skills-manager.ts`'s `createHash` mirrors the CLI's (Node) ledger digest line for
line, and the CLI tests mirror the CLI's `node:` style on purpose.
