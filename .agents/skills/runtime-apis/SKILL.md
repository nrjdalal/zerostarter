---
name: runtime-apis
description: "Prefer Bun-native APIs, else Node built-ins with the node: prefix. Use when importing a Node built-in (fs, path, child_process, crypto, os, util), reading or writing files, spawning a process, or choosing between a Bun and a Node API."
source: local
---

# Runtime APIs

Two rules, in order:

1. **Bun-first.** When the file runs under Bun and a native equivalent exists, use it: `Bun.file`, `Bun.write`, `Bun.spawn`/`Bun.spawnSync`, `Bun.Glob`, `Bun.YAML`, `Bun.serve`.
2. **Else the `node:` prefix.** The Node built-in with its protocol prefix: `import { join } from "node:path"`, `require("node:fs")`. The prefix holds in Bun-only code too: it marks the import as a built-in rather than an npm package, so resolution is identical under every runtime.

## Where Node runs

`Bun.*` exists only on the Bun runtime. These areas run on Node in at least one of their environments, so `node:` is load-bearing there and `Bun.*` is a crash:

| Area | Runtime | Rule |
| --- | --- | --- |
| `.github/workflows/*` (`actions/github-script`) | Node | `require("node:...")`. |
| `packages/cli/**` (canonical starter only) | Node | `node:` only: published to npm and launched through `npx`, so `Bun.*` breaks every user. |
| `packages/env/**` | Node + Bun | `node:` only, imported by web and api alike. `web-next.ts` and the package index are imported by client components, so they carry no `node:*` at all, prefixed or not (`codebase-map` holds the env entrypoints). |
| `web/next/**` | Node + Bun | `node:` only: `next dev` runs under the system Node, while Docker and Vercel serve the build under Bun. |

Bun-first applies to the Bun-only files: `.github/scripts/*.ts`, `packages/scripts/src/*.ts` and, in the canonical starter, the end-to-end helper `tests/stack.ts`; the CLI's tests mirror the CLI's `node:` style on purpose.

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

No bare built-in specifier exists anywhere. `$B` is the full Node built-in list, so a new bare import cannot slip through; extend it only when Node ships a new module. Done when this prints nothing:

```bash
B='assert|async_hooks|buffer|child_process|cluster|console|constants|crypto|dgram|diagnostics_channel|dns|domain|events|fs|http|http2|https|inspector|module|net|os|path|perf_hooks|process|punycode|querystring|readline|repl|stream|string_decoder|sys|timers|tls|trace_events|tty|url|util|v8|vm|wasi|worker_threads|zlib'
rg -n "from ['\"]($B)(/[a-z_]+)?['\"]|require\(['\"]($B)(/[a-z_]+)?['\"]\)" -g '!**/dist/**' -g '!.claude/worktrees/**' --hidden
```
