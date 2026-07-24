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

### `fast-uri` → `^3.1.4`

- **Advisory:** [GHSA-v2hh-gcrm-f6hx](https://github.com/advisories/GHSA-v2hh-gcrm-f6hx) (high): host confusion via a literal backslash authority delimiter. Affects `fast-uri >=3.0.0 <=3.1.3`.
- **Why an override:** the affected `fast-uri@3.1.3` reaches us transitively through `@commitlint/cli` (`ajv`) and `shadcn`, neither of which pins a lifted range. `fast-uri@4.x` is a major that `ajv` does not accept, so the override stays in the `3.x` line at `3.1.4` (the patched release) rather than bumping a parent.
- **Risk:** low. `fast-uri` is a build/lint-time URI parser used by `ajv` schema validation and the `shadcn` CLI, not shipped in the app runtime; `3.1.4` is a patch over `3.1.3`.
- **Exit criteria:** remove the override once `ajv` (via `@commitlint/*`) and `shadcn` depend on `fast-uri >=3.1.4`.

### `postcss` → `^8.5.23`

- **Advisory:** [GHSA-6g55-p6wh-862q](https://github.com/advisories/GHSA-6g55-p6wh-862q) and [GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849) (high): arbitrary `.map` file read and path traversal via an attacker-controlled `sourceMappingURL` in CSS comments. Affects `postcss <=8.5.11`.
- **Why an override:** a stale `postcss@8.4.31` is pinned transitively (through `@tailwindcss/postcss`, `next`, and `shadcn`) even though the tree already resolves a patched `8.5.x` elsewhere, so only an override forces the old copy up. `8.5.23` is the latest `8.x` and is backward compatible.
- **Risk:** low. `postcss` runs at build time on our own CSS (Tailwind), not on attacker-controlled stylesheets, and `8.x` is API-stable.
- **Exit criteria:** remove the override once every transitive parent depends on `postcss >=8.5.12`.

### `sharp` → `^0.35.3`

- **Advisory:** [GHSA-f88m-g3jw-g9cj](https://github.com/advisories/GHSA-f88m-g3jw-g9cj) (high): inherited libvips vulnerabilities (CVE-2026-33327, CVE-2026-33328, CVE-2026-35590, CVE-2026-35591). Affects `sharp <0.35.0`.
- **Why an override:** our direct `sharp` (catalog `^0.35.3`) is already patched, but `next` pulls a second, vulnerable `sharp@0.34.5` transitively and `16.2.11` (latest stable) still pins it. The override dedupes the whole tree onto `0.35.3`, the version we already ship.
- **Risk:** low. It converges the transitive copy onto the exact version our own image pipeline (OG rendering, `compress-images.ts`) already uses.
- **Exit criteria:** remove the override once `next` depends on `sharp >=0.35.0`.

### `shell-quote` → `^1.10.0`

- **Advisory:** [GHSA-395f-4hp3-45gv](https://github.com/advisories/GHSA-395f-4hp3-45gv) (high): quadratic-complexity denial of service in `parse()` (CWE-407). Affects `shell-quote <=1.8.4`.
- **Why an override:** `shell-quote@1.8.4` reaches us only through `concurrently` (`@api/hono` dev script), which at its latest release (`10.0.3`) still pins the affected range, so updating the parent cannot lift the tree.
- **Risk:** low. `concurrently` is a dev-only process orchestrator that never runs in production, and it does not feed untrusted input to `shell-quote.parse()`.
- **Exit criteria:** remove the override once `concurrently` depends on `shell-quote >=1.9.0`.
