# bun audit

> [!NOTE]
> This file is the canonical record of dependency-audit overrides/exceptions (`bun audit --audit-level high` runs in the pre-push hook on canary). It intentionally exists even when no overrides are required, do not delete it.

> bun audit --level high

## Catalog ranges

Every `catalog` entry uses a caret range, and `.github/scripts/deps-manager.ts` enforces it on `postinstall`:

- An exact version (`1.2.3`), a partial (`4.7`, `5`) or a tilde (`~1.2.3`) is rewritten to a caret, and each change is printed under `[INFO] Normalized catalog ranges to caret`.
- Normalization runs _after_ the auto-move step, so a spec promoted into the catalog from a workspace dep is caught in the same run. That matters because `bun add` writes a workspace dep, and `bun add -E` writes an exact one.
- Anything it cannot convert safely is left untouched and reported under `[INFO] Catalog ranges that are not caret and cannot be converted safely`: compound ranges (`>=4.4.3 <5`), wildcards (`2.x`), and dist-tags (`latest`). Fix those by hand.
- Non-range specs are skipped silently, since a caret is meaningless for them: `workspace:`, `file:`, `link:`, `portal:`, `npm:` aliases, `github:owner/repo`, and git or http URLs.

Rewriting a spec after resolution leaves `bun.lock` holding the old spec string until the next install, so the first `bun install` after a pin fixes `package.json` but leaves the lockfile one step behind. A second `bun install` heals it. Committing the intermediate state is harmless: `bun install --frozen-lockfile` compares the resolved package set rather than the recorded spec, verified to pass in both directions without rewriting the lockfile. This matters because `auto-labeler.yml` installs with `--frozen-lockfile`.

Note that a caret on a prerelease widens it more than it may look: `^2.0.14-beta.1` admits `2.0.14-beta.2` and every later `2.x`. A prerelease is the one spec most often pinned on purpose, so if an exact prerelease matters, record the reason here before the rule rewrites it.

The rule has **no opt-out**, so no pin survives an install, whatever reason is recorded here. Pinning something deliberately means changing the rule itself in `.github/scripts/deps-manager.ts`, for example adding an allowlist it skips, and writing down why in this file. That was left out on purpose: there is nothing to exempt today, and an unused config key is worse than adding one when a real case appears.

Enforcement is only partial by design. Specs the rule cannot convert are reported and the script still exits 0, so a compound range such as `>=4.4.3 <5` survives an install with nothing but a line of `postinstall` output. Failing the install instead would block work for a range that may be perfectly deliberate, so the auto-convertible half is enforced and the rest is advisory.

## Named catalogs

A workspace that genuinely cannot take the shared version gets a named entry in the root `catalogs` block and references it as `catalog:<name>`. `eachCatalog` in the script walks the named groups alongside the main `catalog`, so the caret rule and the unused-key report cover them without extra config. The auto-move step preserves a `catalog:<name>` reference instead of collapsing it to `catalog:`, which is the whole reason the exception holds across an install.

### `catalog:next` → `typescript@^6.0.3` (`web/next`)

- **Why:** `next build` runs its type check through the TypeScript **JS API** (`verify-typescript-setup.js` does `require('typescript')` and hands the module to `runTypeCheck`). TypeScript 7 is the native compiler and ships only `lib/tsc.js`, `lib/getExePath.js`, and `lib/version.cjs`, no `lib/typescript.js`, so there is no JS API to hand over and the check cannot run.
- **Why 6.0.3:** TypeScript 6.0 is the feature-frozen JS twin of 7.0, so the check runs on the same language version the rest of the monorepo compiles with. Everything outside `web/next` stays on native `typescript` 7 from the main catalog.
- **Retire when:** Next ships TypeScript 7 support (landing in the 16.3 line; 16.2.x is the latest stable). Then drop the `catalogs` block and move `web/next` back to `catalog:`.

## Active overrides

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

## Retired overrides

Kept as a record so a returning advisory is recognised rather than re-investigated from scratch.

- **`fast-uri` → `^3.1.4`** ([GHSA-v2hh-gcrm-f6hx](https://github.com/advisories/GHSA-v2hh-gcrm-f6hx), high). Held up for `@commitlint/cli` (`ajv`) and `shadcn`. Both now resolve `fast-uri@3.1.4` on their own, meeting the recorded exit criterion.
- **`shell-quote` → `^1.10.0`** ([GHSA-395f-4hp3-45gv](https://github.com/advisories/GHSA-395f-4hp3-45gv), high). Held up for `concurrently`, which now resolves `shell-quote@1.9.0`, past the `<=1.8.4` affected range.
- **`esbuild` → `^0.28.1`**. Retired by decision, not because a parent caught up, so this one is an accepted exposure rather than a resolved one.
  - It was added for [GHSA-gv7w-rqvm-qjhr](https://github.com/advisories/GHSA-gv7w-rqvm-qjhr) (high), **withdrawn on 2026-06-17** for naming the wrong package: the flaw was in esbuild's Deno distribution, not the npm one. Verified withdrawn, `bun audit` no longer reports it at any level with the override gone.
  - What removing it costs: `drizzle-kit@0.31.10` still reaches the legacy `@esbuild-kit/esm-loader` → `@esbuild-kit/core-utils` chain, which pins `esbuild ~0.18.20`, so the tree carries `0.18.20` beside the patched `0.25.12` and `0.28.1`. That copy is in range for [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99) (**moderate**): esbuild's dev server answers any website's cross-origin request and returns the response. Affects `esbuild <=0.24.2`.
  - **Why that is acceptable:** the affected surface is `esbuild serve`, which nothing here starts. `drizzle-kit` uses the loader to read `drizzle.config.ts`, and `bun run dev` serves through Next and Hono. The advisory is moderate, so `bun audit --audit-level high` (the pre-push gate) stays green.
  - **Reinstate the override** if anything in the repo starts running esbuild's own dev server, or if this advisory is ever re-rated high.
  - `fumadocs-mdx@15.2.0` requires `^0.28.1` on its own and never needed the override; `drizzle-kit`'s direct range (`^0.25.4`) is clear too. The `@esbuild-kit/*` chain was the only thing it still held up.
