---
name: add-package
description: Add a new shared workspace package under packages/*. Use when creating a new @packages/<name>, whether a bundled library other workspaces import or a build-only script package that runs during a build.
---

# Add a Package

Workspaces are globbed as `api/*`, `packages/*`, `web/*` (root `package.json`). A new shared package lives at `packages/<name>/` and is named `@packages/<name>`. Every package shares one shape; copy an existing sibling, do not invent a new layout.

## Pick the shape

- **Library** (`env`, `db`, `auth`, `config`): built with tsdown to `dist/`, imported by other workspaces via an `exports` map. Use when code is consumed at runtime.
- **Build-only script** (`scripts`): never bundled, never imported at runtime. Its `.ts` files run via `bun src/<x>.ts` during another package's build (e.g. `@packages/auth`'s `build` runs `bun ../scripts/src/generate-env.ts auth` first). Use for build-time codegen. Keep CI/repo tooling in `.github/scripts` instead; `packages/scripts` is for app-build tooling that needs workspace deps.

## Common skeleton (both shapes)

```
packages/<name>/
├── package.json
├── tsconfig.json
└── src/
    └── index.ts        # source under src/, imported via @/ (a build-only script names its entry by function, e.g. generate-env.ts, not index.ts)
```

`package.json` fields shared by every package:

```jsonc
{
  "name": "@packages/<name>",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "check-types": "tsc --noEmit"
  },
  "devDependencies": {
    "@packages/config": "workspace:*",
    "@types/bun": "catalog:",
    "@types/node": "catalog:",
    "typescript": "catalog:"
  }
}
```

`@packages/config` MUST be a devDependency: `tsconfig.json` extends it, and without the dep the `extends` cannot resolve. Keep deps and `exports` alphabetical (A→Z); catalog-versioned deps use `"catalog:"`, workspace deps use `"workspace:*"`.

`tsconfig.json` (identical to `env`/`db`/`auth`):

```json
{
  "extends": "@packages/config/tsconfig.json",
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

## Library shape (adds to the skeleton)

```jsonc
{
  // ...skeleton...
  "files": ["dist"],
  "exports": {
    ".": { "types": "./dist/index.d.mts", "default": "./dist/index.mjs" }
  },
  "scripts": {
    "build": "tsdown",
    "check-types": "tsc --noEmit"
  },
  "dependencies": { /* runtime deps */ },
  "devDependencies": {
    "@packages/config": "workspace:*",
    "@types/bun": "catalog:",
    "@types/node": "catalog:",
    "tsdown": "catalog:",
    "typescript": "catalog:"
  }
}
```

Add one export entry per `entry` file. `tsdown.config.ts` uses the shared helper (validates env in `build:prepare`, emits tsgo dts, minifies):

```ts
import { definePackageConfig } from "@packages/config/tsdown"
import { getSafeEnv } from "@packages/env"
import { env } from "@packages/env/<name>"

export default definePackageConfig({
  name: "@packages/<name>",
  env,
  getSafeEnv,
})
```

A package with no env of its own can pass another package's `env`/`getSafeEnv`, or (like `env` itself) call `defineConfig` from tsdown directly. `turbo.json`'s `build.outputs` already lists `dist/**`, so no turbo edit is needed.

## Build-only script shape (adds to the skeleton)

No `build`, no `exports`, no `files`, no `tsdown`. Add only the script's own tool deps (e.g. `tldts`) as devDependencies. Because the entry is a Bun script using `Bun.*` / `import.meta.dir` / `node:*`, the native tsc preview (tsgo) does not auto-include `@types/*` for it, so pin `types: ["bun"]` exactly as `packages/cli` (the repo's other Bun package) and `.github/scripts/tsconfig.json` do:

```json
{
  "extends": "@packages/config/tsconfig.json",
  "compilerOptions": {
    "types": ["bun"],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

`types: ["bun"]` is the only line that differs from a library's tsconfig; `bun-types` pulls in the node references, so `@types/node` stays a devDep but needs no separate `types` entry. The consumer runs it in its own `build`, e.g. `"build": "bun ../<name>/src/<script>.ts && tsdown"` (a `bun <path>` sibling-script call, the same pattern `web/next` and `api/hono` use for `.github/scripts/*.ts`), and declares `"@packages/<name>": "workspace:*"` as a devDependency so `turbo prune` keeps it in the Docker build. Invoke it from the consumer's directory (the `bun ../<name>/...` form), not the repo root: a script that reads env via `@packages/env` inherits its cwd-relative `.env` load (`cwd/../../.env`), so running it from root silently misses `.env`.

Write any generated artifact to the repo-root `.generated/` dir (gitignored, dockerignored, and removed by `bun run clean`), not inside a package. `.generated/` is the one centralized home for generated-but-disposable files the build consumes; keep individual packages free of committed-or-not `*.generated.*` files. When you add a new generated artifact type, add it to `.gitignore`/`.dockerignore` and `.github/scripts/clean.sh` together.

## Wire it up

1. `bun install` from the repo root to link the new workspace (fresh worktrees also need this before the pre-commit build; set `NODE_ENV=production SKIP_ENV_VALIDATION=true`).
2. In each consumer, add `"@packages/<name>": "workspace:*"` (a runtime `dependency` for a library, a `devDependency` for a build-only package) and import via `@packages/<name>` (or a subpath export).
3. Runtime code follows the `runtime-apis` skill: Bun-native APIs where they exist, else `node:`-prefixed built-ins.
4. Verify: `bunx turbo run check-types build test` is green and the new package appears in the run.

## Keep docs in sync

Adding a package touches the map. In the same change, update: the `packages/*` list in `AGENTS.md`/`CLAUDE.md`; both structure trees, `README.md` (`## Monorepo Structure`) and `web/next/content/docs/getting-started/project-structure.mdx` (its frontmatter/intro package count, the tree, and the "The packages" list); the `codebase-map` skill; and any skill whose globs name package paths (e.g. `runtime-apis`). A fork keeps build-only packages like `scripts` (unlike `cli`, which `init` strips), so they belong in the user-facing trees too. See the `doc-sync` skill.

## Gotchas

- Missing `@packages/config` devDep → `tsconfig extends` fails to resolve. It is a dep, not just a base file.
- A Bun-script package without `types: ["bun"]` fails `check-types` with `Cannot find name 'Bun'` / `'node:...'` under tsgo, even though the identical library config auto-includes fine. Pin `types` for script packages only.
- Keep `exports`, `entry`, and dependency lists alphabetical so they match their docs (`order-lists-alphabetically`).
