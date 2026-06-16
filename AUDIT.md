# bun audit

> [!NOTE]
> This file is the canonical record of dependency-audit overrides/exceptions (`bun audit --audit-level high` runs in the pre-commit hook on canary). It intentionally exists even when no overrides are required, do not delete it.

> bun audit --level high

## Active overrides

### `esbuild` → `^0.28.1`

- **Advisory:** [GHSA-gv7w-rqvm-qjhr](https://github.com/advisories/GHSA-gv7w-rqvm-qjhr) (high): missing binary integrity verification in esbuild's Deno module enables RCE via `NPM_CONFIG_REGISTRY`. Affects `esbuild >=0.17.0 <0.28.1`.
- **Why an override:** the advisory reaches us transitively through `drizzle-kit` (`@packages/db`) and `fumadocs-mdx` (`@web/next`). `drizzle-kit@0.31.10` is the latest release and still pins `esbuild ^0.25.4`, so updating dependencies alone cannot lift the tree past the affected range. A single `overrides.esbuild` entry forces every transitive `esbuild` to `0.28.1`.
- **Risk:** low. We install esbuild via Bun's npm registry path (platform binary as `optionalDependencies`), not the Deno module the advisory targets. The override only bumps a build-time bundler used by `drizzle-kit`/`fumadocs-mdx`.
- **Exit criteria:** remove the override once `drizzle-kit` ships a release depending on `esbuild >=0.28.1`.

### `hono` → `^4.12.25`

- **Advisory:** [GHSA-88fw-hqm2-52qc](https://github.com/advisories/GHSA-88fw-hqm2-52qc) (high): the CORS middleware reflects any `Origin` with credentials when `origin` defaults to the wildcard. Affects `hono <4.12.25`.
- **Why an override:** the direct `hono` dependency already sits on `^4.12.25` via the catalog, but `hono-rate-limiter@0.5.3` (`@api/hono`) and `shadcn` (`@web/next`) still pull `hono@4.12.18` transitively, so a dependency bump alone leaves the affected version in the tree. A single `overrides.hono` entry forces every transitive `hono` to `4.12.25`.
- **Risk:** low. `4.12.18` to `4.12.25` is a same-minor patch bump, and our CORS middleware sets an explicit trusted-origin allowlist (`origin: env.HONO_TRUSTED_ORIGINS` in `api/hono/src/index.ts`), not the wildcard default the advisory targets.
- **Exit criteria:** remove the override once `hono-rate-limiter` and `shadcn` depend on `hono >=4.12.25`.
