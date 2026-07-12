# bun audit

> [!NOTE]
> This file is the canonical record of dependency-audit overrides/exceptions (`bun audit --audit-level high` runs in the pre-push hook on canary). It intentionally exists even when no overrides are required, do not delete it.

> bun audit --level high

## Active overrides

### `esbuild` → `^0.28.1`

- **Advisory:** [GHSA-gv7w-rqvm-qjhr](https://github.com/advisories/GHSA-gv7w-rqvm-qjhr) (high): missing binary integrity verification in esbuild's Deno module enables RCE via `NPM_CONFIG_REGISTRY`. Affects `esbuild >=0.17.0 <0.28.1`.
- **Why an override:** the advisory reaches us transitively through `drizzle-kit` (`@packages/db`) and `fumadocs-mdx` (`@web/next`). `drizzle-kit@0.31.10` is the latest release and still pins `esbuild ^0.25.4`, so updating dependencies alone cannot lift the tree past the affected range. A single `overrides.esbuild` entry forces every transitive `esbuild` to `0.28.1`.
- **Risk:** low. We install esbuild via Bun's npm registry path (platform binary as `optionalDependencies`), not the Deno module the advisory targets. The override only bumps a build-time bundler used by `drizzle-kit`/`fumadocs-mdx`.
- **Exit criteria:** remove the override once `drizzle-kit` ships a release depending on `esbuild >=0.28.1`.
