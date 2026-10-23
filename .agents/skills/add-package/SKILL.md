---
name: add-package
description: Add a new shared workspace package under packages/*. Use when creating a new @packages/<name>, a bundled library other workspaces import or a build-only script package that runs in a build or on demand.
source: local
---

# Add a Package

The root `package.json` globs workspaces as `api/*`, `packages/*`, `web/*`, so `packages/<name>/`, named `@packages/<name>`, is a workspace the moment it exists. Two shapes, each with a sibling to copy: a **library** is tsdown-built to `dist/` and imported through its `exports` (`packages/db`, or `packages/auth` when it ships several entries), and a **build-only script package** is never bundled and runs as `bun <path>.ts` (`packages/scripts`, where `AGENTS.md` lands every new script).

## 1. Copy the sibling

Copy its `package.json`, `tsconfig.json` and, for a library, `tsdown.config.ts`; rename, drop the sibling's own dependencies, and apply these deltas. `@packages/config` stays a devDependency: `tsconfig.json` extends it and `tsdown.config.ts` imports the `definePackageConfig` factory from it, which takes the package's `env` and `getSafeEnv` to validate the env at build time. A library with no env of its own copies `packages/config`'s `tsdown.config.ts` instead, which calls tsdown's `defineConfig` directly; `packages/env` does the same because the factory validates through env's own build. A script package carries `types: ["bun"]` in `tsconfig.json`, so `tsc` knows the Bun globals, and no `build`, `exports` or `files`. A library with several entries lists them all in `entry`, `src/index.ts` included, since the option replaces the default, with one `exports` entry per file. Done when `bun install` records `packages/<name>` in `bun.lock` and `bunx turbo run check-types --filter=@packages/<name>` exits 0.

## 2. Wire the consumers

A library goes in each consumer's `dependencies`, a script package in `devDependencies`, so `turbo prune` carries either into the Docker build. A library that reaches `@packages/env/load-dotenv`, through a server env slice as `packages/db` does or a slice of its own, stays out of `web/next`'s server code, since Next's tracer would copy the root `.env` into the web image (`ignore-sync` says how); the web reads that data through the api. A script runs from the consumer's directory, where turbo runs every script, by relative path (`bun ../scripts/src/generate-env.ts auth` in `packages/auth`'s `build`, `bun ../../packages/<name>/src/<x>.ts` from an app), because the `.env` load resolves `../../.env` from the working directory (`codebase-map` holds the env entrypoints). A script package's `src/**` joins `globalDependencies` in `turbo.json`, since it has no build task for a consumer's hash to follow, so a cached consumer build would replay stale output. Disposable output goes to the repo-root `.generated/`; a new artifact kind is added to `.dockerignore`, `.github/scripts/clean.sh` and `.gitignore` together. Done when `rg "@packages/<name>" -g package.json` lists every consumer beside the package itself, and `bunx turbo run build --filter=<consumer>` exits 0 with a library in its run, or with a script's command line in the consumer's build log and its artifact under `.generated/` where it writes one.

## 3. Verify

Done when `bunx turbo run check-types build` lists the package and exits 0, and in the canonical starter `bun run test` passes.

## 4. Sync the map

The surfaces that list packages: the `codebase-map` tree, the `README.md` tree, the `/llms-full.txt` preamble in `packages/config/src/site.ts`, and both the tree and the table in `web/next/content/docs/getting-started/project-structure.mdx`; a script package also joins the Bun-only paths in `runtime-apis`. A fork takes neither `README.md` nor `web/next/content/`, and the CLI writes its `site.ts` with an empty preamble. Done when every surface that names the sibling you copied also names the new package (`rg -l "\b<sibling>\b"` and `rg -l "\b<name>\b"` over those four paths list the same files), and `runtime-apis` names a script package.
