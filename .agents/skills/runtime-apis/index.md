# Node API index

Per-file inventory of every Node built-in used in the repo, for the [`runtime-apis`](SKILL.md) skill.
Snapshot: 2026-07-17. Regenerate with the `rg "node:..."` command in `SKILL.md`.

The `Runtime` column drives the rule: **Node** and **Both** files stay on `node:` (no `Bun.*`);
**Bun** files may move a call to a `Bun.*` equivalent where one exists.

| File | Runtime | `node:` modules (APIs used) |
| --- | --- | --- |
| `.github/scripts/compress-images.ts` | Bun | `node:path` (path) |
| `.github/scripts/docs.ts` | Bun | `node:path` (path) |
| `.github/scripts/ensure-remote-branches.ts` | Bun | `node:child_process` (execFileSync) |
| `.github/scripts/shadcn-customize.ts` | Bun | `node:child_process` (execFileSync); `node:fs` (readFileSync, writeFileSync) |
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
| `packages/cli/src/vendor/nano-spawn.ts` | Node | `node:child_process` (spawn, SpawnOptions); `node:fs/promises` (access); `node:path` (delimiter, resolve) |
| `packages/cli/test/convert.test.ts` | Bun | `node:fs` (mkdtempSync, readFileSync, rmSync); `node:os` (tmpdir); `node:path` (join) |
| `packages/cli/test/db.test.ts` | Bun | `node:fs` (mkdtempSync, readFileSync, rmSync, writeFileSync); `node:os` (tmpdir); `node:path` (join) |
| `packages/cli/test/git.test.ts` | Bun | `node:child_process` (execFileSync); `node:fs` (existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync); `node:os` (tmpdir); `node:path` (join) |
| `packages/cli/test/io.test.ts` | Bun | `node:child_process` (execFileSync); `node:fs` (mkdirSync, mkdtempSync, rmSync, writeFileSync); `node:os` (tmpdir); `node:path` (join) |
| `packages/env/src/lib/utils.ts` | Both | `node:path` (path) |
| `packages/env/tsdown.config.ts` | Build | `node:child_process` (execSync) |
| `packages/scripts/src/generate-env.ts` | Bun | `node:path` (resolve) |
| `web/next/next.config.ts` | Node | `node:fs` (readFileSync); `node:path` (resolve) |
| `web/next/src/app/layout.tsx` | Node | `node:fs` (existsSync); `node:path` (join) |

## Convertible to `Bun.*` (optional, Bun-only files)

Only where the file runs **only** under Bun and the call has a `Bun.*` equivalent:

| File | Node call | Bun equivalent |
| --- | --- | --- |
| `.github/scripts/ensure-remote-branches.ts` | `execFileSync` | `Bun.spawnSync` |
| `.github/scripts/shadcn-customize.ts` | `execFileSync` | `Bun.spawnSync` |
| `.github/scripts/shadcn-customize.ts` | `readFileSync` / `writeFileSync` | `Bun.file().text()` / `Bun.write` |

`ensure-remote-branches.ts` is also shared into forks via `lefthook.yml`, where portable `node:child_process` is a feature, not a gap.
