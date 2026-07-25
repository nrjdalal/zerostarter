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

## Active overrides

### `esbuild` → `^0.28.1`

- **Advisory:** [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99) (moderate): esbuild's dev server answers any website's cross-origin request and returns the response. Affects `esbuild <=0.24.2`.
- **Why an override:** `drizzle-kit@0.31.10` still reaches the legacy `@esbuild-kit/esm-loader` → `@esbuild-kit/core-utils` chain, which pins `esbuild ~0.18.20`, so a fresh resolve pulls the affected copy back in alongside the patched one. A single `overrides.esbuild` entry collapses every transitive `esbuild` onto `0.28.1`. `fumadocs-mdx@15.2.0` now requires `^0.28.1` on its own and no longer needs the override; `drizzle-kit`'s own direct range (`^0.25.4`) is already clear too, so the `@esbuild-kit/*` chain is the only thing this still holds up.
- **Risk:** low. It bumps a build-time bundler, and the dev server the advisory targets is never started here.
- **Exit criteria:** remove the override once `drizzle-kit` drops the `@esbuild-kit/*` chain.
- **Note:** this override previously cited [GHSA-gv7w-rqvm-qjhr](https://github.com/advisories/GHSA-gv7w-rqvm-qjhr), which was **withdrawn on 2026-06-17** for naming the wrong package (the flaw was in esbuild's Deno distribution, not the npm one). Verified withdrawn: with the override removed, `bun audit` no longer reports it at any level. The override was kept for the live advisory above, not the withdrawn one.

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

Kept as a record so a returning advisory is recognised rather than re-investigated from scratch. Both were dropped once a fresh resolve satisfied their own exit criteria without help.

- **`fast-uri` → `^3.1.4`** ([GHSA-v2hh-gcrm-f6hx](https://github.com/advisories/GHSA-v2hh-gcrm-f6hx), high). Held up for `@commitlint/cli` (`ajv`) and `shadcn`. Both now resolve `fast-uri@3.1.4` on their own.
- **`shell-quote` → `^1.10.0`** ([GHSA-395f-4hp3-45gv](https://github.com/advisories/GHSA-395f-4hp3-45gv), high). Held up for `concurrently`, which now resolves `shell-quote@1.9.0`, past the `<=1.8.4` affected range.
