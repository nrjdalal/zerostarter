---
name: add-package
description: Add a new shared workspace package under packages/*. Use when creating a new @packages/<name>, whether a bundled library other workspaces import or a build-only script package that runs during a build or on demand (bun run <script>).
source: local
---

# Add a Package

The root `package.json` globs workspaces as `api/*`, `packages/*`, `web/*`. A shared package lives at `packages/<name>/` and is named `@packages/<name>`. Every package shares one shape, and `bun run sync:config` writes its type-check part (the `tsconfig.json`, the type-check devDependencies and the `check-types` script) from one template, so you write only what makes the package its own.

## Pick the shape

- **Library** (`env`, `db`, `auth`, `config`): tsdown-built to `dist/` and imported by other workspaces through an `exports` map. Use it when code is consumed at runtime.
- **Build-only script** (`scripts`): never bundled, never imported at runtime. Its `.ts` files run via `bun src/<x>.ts`, either during another package's build (`@packages/auth`'s `build` runs `bun ../scripts/src/generate-env.ts auth` first) or on demand from a root script (`bun run auth:schema` runs `auth-schema.ts`). Use it for build-time codegen, for regenerators of committed source, and for every build, CI, or repo tooling script (`release-version.ts` decides the release number for the workflows from here), as `AGENTS.md` requires.

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
    "check-types": "tsrs --noEmit"
  },
  "devDependencies": {
    "@packages/config": "workspace:*",
    "@types/bun": "catalog:",
    "@types/node": "catalog:",
    "tsrs": "catalog:",
    "typescript": "catalog:"
  }
}
```

The `check-types` script and those five devDependencies are the type-check set. `sync:config` writes it into every package. `tsconfig.json` extends `@packages/config`, `check-types` runs `tsrs`, and the config needs `typescript` and both `@types/*`. A dep that is already in `dependencies` stays there, as `@packages/config` does in `api/hono` and `web/next`. Keep deps and `exports` alphabetical (A→Z); catalog-versioned deps use `"catalog:"`, workspace deps use `"workspace:*"`.

`packages/config` is the one exception. Its `tsconfig.json` is the base that every other one extends, so `sync:config` skips it. It has no `@packages/config` or `@types/*`, because its own code uses no runtime API.

`tsconfig.json`, as `sync:config` writes it from `packages/scripts/src/sync-config/template.json`:

```json
{
  "extends": "@packages/config/tsconfig.json",
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    },
    "types": ["bun"]
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules"]
}
```

Set `types` to the runtime that the package's own code runs on. tsrs does not load `@types/*` by itself, so `types` names what the package's own code can use. Code that runs on the Bun server keeps the template's `["bun"]`: `api/hono`, `auth`, `db` and `scripts`. Code that also runs under Node takes `["node"]`: `cli` (the npm binary), and `env` and `web/next` (`next dev` runs them under Node). In those three, a `Bun.*` call fails the type check with `Cannot find name 'Bun'`, not the Node process.

A dependency can still bring types in, whatever `types` says. `@packages/db` uses drizzle-orm's `bun-sql` driver, so Bun's types reach `db` and every package that imports it. `auth` shows the limit: its `access` entry also runs in `web/next` under Node, but `auth` imports `@packages/db`, so no `types` value makes its check catch a `Bun.*` call there. Keep `auth/src/access.ts` free of `Bun.*` by hand.

Any other difference goes in the package's patch, `packages/scripts/src/sync-config/<path, / as ->.json` (`web-next.json`): a `.tsx` include, a `jsxImportSource`, another `types`. `sync:config` merges the patch over the template. An object merges, any other value replaces, and `null` removes the key. The patch is the only place for the difference. A hand edit to a generated file fails `bun run sync:config --check` in CI.

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
    "check-types": "tsrs --noEmit"
  },
  "dependencies": { /* runtime deps */ },
  "devDependencies": {
    "@packages/config": "workspace:*",
    "@types/bun": "catalog:",
    "@types/node": "catalog:",
    "tsdown": "catalog:",
    "tsrs": "catalog:",
    "typescript": "catalog:"
  }
}
```

Add one `exports` entry per `entry` file. `tsdown.config.ts` uses the shared helper, which validates env in `build:prepare`, emits dts through `typescript`, and minifies: A package that ships more than one entry lists them all in `definePackageConfig({ entry: [...] })`, `src/index.ts` included, because the option replaces the default rather than extending it; `@packages/auth` is the worked example, with `src/access.ts` as a second entry so the web can import the pure rules without the auth runtime.

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

A package with no env of its own can pass another package's `env`/`getSafeEnv`, or (like `env` itself) call tsdown's `defineConfig` directly. `turbo.json`'s `build.outputs` already lists `dist/**`, so no turbo edit is needed.

## Build-only script shape (adds to the skeleton)

No `build`, no `exports`, no `files`, no `tsdown`; add only the script's own tool deps (e.g. `tldts`) as devDependencies. A tool the script spawns inside another package rather than imports (the auth CLI, run from `packages/auth` so it reads that tsconfig's paths) is that package's devDependency, since `bunx` resolves it from the working directory. The entry is a Bun script that uses `Bun.*`, `import.meta.dir` or `node:*`, so it keeps the template's `types: ["bun"]` and needs no patch. `bun-types` includes the Node types, so `"node"` is not needed beside it. The consumer runs the script in its own `build`, e.g. `"build": "bun ../<name>/src/<script>.ts && tsdown"` (the same `bun <path>` sibling-script call `web/next` and `api/hono` use for `packages/scripts/src/docs.ts` and `portless.ts`), and declares `"@packages/<name>": "workspace:*"` as a devDependency so `turbo prune` keeps it in the Docker build. Invoke it from the consumer's directory (the `bun ../<name>/...` form), not the repo root: a script that reads env inherits the cwd-relative `.env` load (`cwd/../../.env`) that `@packages/env/load-dotenv` performs, so running it from root silently misses `.env`. That load rides on the server targets, `api-hono`, `auth` and `db`, which each import `@/load-dotenv`. Two entrypoints deliberately do not: the `@packages/env` index, which carries only constants and `getSafeEnv`, and `web-next`, which client components import and so must stay free of `node:*`. A script reaching env through either of those imports `@packages/env/load-dotenv` itself, as `generate-env.ts` does.

Write any generated-but-disposable artifact to the repo-root `.generated/` dir (gitignored, dockerignored, removed by `bun run clean`), never inside a package; a regenerator whose output is committed source (`auth-schema.ts` writing `packages/db/src/schema/auth.ts`) writes that file in place and keeps its scratch in `.generated/`. `.generated/` is the one centralized home for generated-but-disposable files the build consumes, which keeps individual packages free of committed-or-not `*.generated.*` files. When you add a new generated artifact type, add it to `.gitignore`/`.dockerignore` and `packages/scripts/src/clean.ts` together.

## Wire it up

1. `bun run sync:config` from the repo root writes the package's `tsconfig.json` and type-check set; add its patch first when it must differ. Done when `bun run sync:config --check` exits 0.
2. `bun install` from the repo root to link the new workspace (a fresh worktree also needs this before the pre-commit build; set `NODE_ENV=production SKIP_ENV_VALIDATION=true`).
3. In each consumer, add `"@packages/<name>": "workspace:*"` (a runtime `dependency` for a library, a `devDependency` for a build-only package) and import via `@packages/<name>` (or a subpath export).
4. Runtime code follows the `runtime-apis` skill: Bun-native APIs where they exist, else `node:`-prefixed built-ins.
5. Verify: `bunx turbo run check-types build` and `bun run test` are green and the new package appears in the run.

## Keep docs in sync

Adding a package touches the map. In the same change, update: the `packages/*` list in `AGENTS.md`/`CLAUDE.md`; both structure trees, `README.md` (`## Monorepo Structure`) and `web/next/content/docs/getting-started/project-structure.mdx` (the tree and the "The packages" list); the `codebase-map` skill; and any skill whose globs name package paths (e.g. `runtime-apis`). A fork keeps build-only packages like `scripts` (unlike `cli`, which `init` strips), so they belong in the user-facing trees too. See the `doc-sync` skill.

## Gotchas

- Missing `@packages/config` devDep → `tsconfig extends` fails to resolve. It is a dep, not just a base file.
- `check-types` fails with `Cannot find name 'Bun'` or `'node:...'` → the package's `types` does not name its runtime, and no dependency brings it in. Set it as the tsconfig section says.
- Keep `exports`, `entry`, and dependency lists alphabetical so they match their docs (`order-lists-alphabetically`).
