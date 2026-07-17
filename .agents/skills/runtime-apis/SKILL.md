---
name: runtime-apis
description: Prefer Bun-native APIs, else Node built-ins with the node: prefix. Use when importing a Node built-in (fs, path, child_process, crypto, os, util), reading or writing files, spawning a process, or choosing between a Bun and a Node API.
---

# Runtime APIs

Two rules, in order:

1. **Bun-first.** When the file runs under Bun and a native equivalent exists, use it: `Bun.file`, `Bun.write`, `Bun.spawn`/`Bun.spawnSync`, `Bun.Glob`, `Bun.YAML`, `Bun.serve`.
2. **Else the `node:` prefix.** Reach for a Node built-in with the protocol prefix: `import { join } from "node:path"`, `require("node:fs")`. Never the bare form: write `node:path`, not a bare `path` specifier.

The prefix is mandatory even in Bun-only code: it marks the import as a built-in rather than an npm package, so resolution is identical under every runtime.

## Not everything runs under Bun

`Bun.*` exists only on the Bun runtime. These areas run on **Node**, so `node:` is load-bearing and `Bun.*` is a crash, not a style choice:

| Area | Runtime | Rule |
| --- | --- | --- |
| `packages/cli/**` | Node | `node:` only. Published to npm, launched via `npx` (bin shebang `#!/usr/bin/env node`); `Bun.*` breaks every npx user. |
| `web/next/**` | Node | `node:` only. Next.js on Vercel. |
| `packages/env/**` | Node + Bun | `node:` only. Imported by both web (Node) and api (Bun); stays portable. |
| `.github/workflows/*` (`actions/github-script`) | Node | `require("node:...")`. |

Bun-first applies to Bun-only files: `.github/scripts/*.ts` and `packages/scripts/src/*.ts` (`bun x.ts`). The CLI test files run under `bun test` but mirror the CLI's `node:` style on purpose.

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

No bare (unprefixed) built-in specifier may exist anywhere. This prints nothing when clean:

The alternation `$B` is the full Node built-in list, so a new bare import cannot slip through; extend it only if Node ships a new module.

```bash
B='assert|async_hooks|buffer|child_process|cluster|console|constants|crypto|dgram|diagnostics_channel|dns|domain|events|fs|http|http2|https|inspector|module|net|os|path|perf_hooks|process|punycode|querystring|readline|repl|stream|string_decoder|sys|timers|tls|trace_events|tty|url|util|v8|vm|wasi|worker_threads|zlib'
rg -n "from ['\"]($B)(/[a-z_]+)?['\"]|require\(['\"]($B)(/[a-z_]+)?['\"]\)" -g '!**/dist/**' -g '!.claude/worktrees/**' --hidden
```

The full per-file inventory lives in [`index.md`](index.md): every file, its runtime, and the `node:` modules it imports. Regenerate it when the surface changes:

```bash
rg -n "node:[a-z/_]+" -g '!**/dist/**' -g '!.claude/worktrees/**' --hidden
```
