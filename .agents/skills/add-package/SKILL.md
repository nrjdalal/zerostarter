---
name: add-package
description: Add a new shared workspace package under packages/*. Use when creating a new @packages/<name>, a bundled library other workspaces import or a build-only script package that runs in a build or on demand.
source: local
---

# Add a Package

The root `package.json` globs workspaces as `api/*`, `packages/*`, `web/*`, so `packages/<name>/`, named `@packages/<name>`, is a workspace the moment it exists. Two shapes, each with a sibling to copy: a **library** is tsdown-built to `dist/` and imported through its `exports` (`packages/db`, or `packages/auth` when it ships several entries), and a **build-only script package** is never bundled and runs as `bun <path>.ts` (`packages/scripts`, where `AGENTS.md` lands every new script).

## 1. Copy the sibling

Copy its `package.json`, `tsconfig.json` and, for a library, `tsdown.config.ts`, rename, and keep only these deltas. `@packages/config` stays a devDependency: `tsconfig.json` extends it and `tsdown.config.ts` imports the `definePackageConfig` factory from it. A script package carries `types: ["bun"]` in `tsconfig.json` and no `build`, `exports` or `files`. A library with several entries lists them all in `entry`, `src/index.ts` included, since the option replaces the default, with one `exports` entry per file. `packages/env` alone calls tsdown's `defineConfig` directly, since the factory validates through `@packages/env`'s own build. Done when `bun install` links `node_modules/@packages/<name>` and `bunx turbo run check-types --filter=@packages/<name>` exits 0.

## 2. Wire the consumers

A library goes in each consumer's `dependencies`, a script package in `devDependencies`, so `turbo prune` carries either into the Docker build. A script that reads env runs from the consumer's directory, where turbo runs every script (`bun ../scripts/src/generate-env.ts auth` in `packages/auth`'s `build`), because the `.env` load resolves `../../.env` from the working directory (`codebase-map` holds the env entrypoints). A script package's `src/**` joins `globalDependencies` in `turbo.json`, since it has no build task for a consumer's hash to follow, so a cached consumer build would replay stale output. Disposable output goes to the repo-root `.generated/`; a new artifact kind is added to `.dockerignore`, `.github/scripts/clean.sh` and `.gitignore` together. Done when `rg "@packages/<name>" -g package.json` lists every consumer and `bunx turbo run build --filter=<consumer>` exits 0 with the package in its run.

## 3. Verify

Done when `bunx turbo run check-types build` lists the package and exits 0, and in the canonical starter `bun run test` passes.

## 4. Sync the map

Four surfaces list the packages: the `codebase-map` tree, the `README.md` tree, the `/llms-full.txt` preamble in `packages/config/src/site.ts`, and both the tree and the table in `web/next/content/docs/getting-started/project-structure.mdx`; `runtime-apis` names the Bun-only paths, so a script package joins its list. A fork takes neither `README.md` nor `web/next/content/` (`.gitpickignore`). Done when `rg -l "\b<name>/" .agents/skills/codebase-map/SKILL.md README.md packages/config/src/site.ts web/next/content/docs/getting-started/project-structure.mdx` lists every file that `rg -l "\benv/"` lists on the same paths.
