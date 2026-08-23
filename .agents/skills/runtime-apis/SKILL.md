---
name: runtime-apis
description: "Prefer Bun-native APIs, else Node built-ins with the node: prefix. Use when importing a Node built-in (fs, path, child_process, crypto, os, util), reading or writing files, spawning a process, or choosing between a Bun and a Node API."
source: local
---

# Runtime APIs

Two rules, in order:

1. **Bun-first.** When the file runs under Bun and a native equivalent exists, use it: `Bun.file`, `Bun.write`, `Bun.spawn`/`Bun.spawnSync`, `Bun.Glob`, `Bun.YAML`, `Bun.serve`.
2. **Else the `node:` prefix.** Reach for the Node built-in with its protocol prefix: `import { join } from "node:path"`, `require("node:fs")`. Never the bare specifier: write `node:path`, not `path`.

The prefix is mandatory even in Bun-only code: it marks the import as a built-in rather than an npm package, so resolution is identical under every runtime.

## Not everything runs under Bun

`Bun.*` exists only on the Bun runtime. These areas run on **Node** in at least one of their environments, so `node:` is load-bearing and `Bun.*` is a crash, not a style choice:

| Area | Runtime | Rule |
| --- | --- | --- |
| `packages/cli/**` | Node | `node:` only. Published to npm, launched via `npx` (bin shebang `#!/usr/bin/env node`); `Bun.*` breaks every npx user. |
| `web/next/**` | Node + Bun | `node:` only. `next dev` runs under the system Node locally; Docker (`bun server.js`) and Vercel (`bunVersion`, built via `bun run --bun`) run it under Bun. Stays portable. |
| `packages/env/**` | Node + Bun | `node:` only. Imported by web (Node and Bun) and api (Bun); stays portable. Stricter for `web-next.ts` and the package index: client components import them, so they carry no `node:*` at all, prefixed or not. The `.env` load (`node:path` + `dotenv`) lives in `load-dotenv.ts`, which only the server targets import; a new server target imports `@/load-dotenv` first, and a script that reaches env through `web-next` or the index imports `@packages/env/load-dotenv` itself. |
| `.github/workflows/*` (`actions/github-script`) | Node | `require("node:...")`. |

Bun-first therefore applies to the Bun-only files: `.github/scripts/*.ts` and `packages/scripts/src/*.ts` (`bun x.ts`). The CLI test files run under `bun test` but mirror the CLI's `node:` style on purpose.

## Bun equivalents

| Need | Bun (preferred) | Node fallback |
| --- | --- | --- |
| read file text | `await Bun.file(p).text()` | `node:fs` readFileSync |
| read file bytes | `await Bun.file(p).arrayBuffer()` | `node:fs` readFileSync |
| write file | `await Bun.write(p, data)` | `node:fs` writeFileSync |
| file exists | `await Bun.file(p).exists()` | `node:fs` existsSync |
| spawn a process | `Bun.spawn` / `Bun.spawnSync` | `node:child_process` |
| glob | `new Bun.Glob(pattern)` | (none) |
| parse YAML | `Bun.YAML.parse` | (none) |
| serve HTTP/WS | `Bun.serve` | `@hono/node-server` (Vercel only) |

## Built-ins with no Bun equivalent (always `node:`)

`node:path`, `node:os`, `node:util`, `node:crypto`, `node:readline/promises`, and the directory/sync parts of `node:fs` (`existsSync` in sync code, `mkdirSync`, `mkdtempSync`, `readdirSync`, `rmSync`). Bun ships no `Bun.path`/`Bun.os`, so `node:` is the idiomatic API for these even in pure-Bun files.

## Audit

No bare (unprefixed) built-in specifier may exist anywhere. The `$B` alternation is the full Node built-in list, so a new bare import cannot slip through; extend it only when Node ships a new module. This prints nothing when clean:

```bash
B='assert|async_hooks|buffer|child_process|cluster|console|constants|crypto|dgram|diagnostics_channel|dns|domain|events|fs|http|http2|https|inspector|module|net|os|path|perf_hooks|process|punycode|querystring|readline|repl|stream|string_decoder|sys|timers|tls|trace_events|tty|url|util|v8|vm|wasi|worker_threads|zlib'
rg -n "from ['\"]($B)(/[a-z_]+)?['\"]|require\(['\"]($B)(/[a-z_]+)?['\"]\)" -g '!**/dist/**' -g '!.claude/worktrees/**' --hidden
```

The full per-file inventory lives in [`index.md`](index.md): every file, its runtime, and the `node:` modules it imports. Regenerate it when the surface changes:

```bash
rg -n "node:[a-z/_]+" -g '!**/dist/**' -g '!.claude/worktrees/**' --hidden
```
