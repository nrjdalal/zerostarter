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

### `js-yaml` → `^4.3.1`

- **Advisory:** [GHSA-5p4m-2wfm-xmqj](https://github.com/advisories/GHSA-5p4m-2wfm-xmqj) (high): quadratic CPU consumption resolving `!!omap`, the CVE-2026-59870 fix not backported. Affects `js-yaml >=4.0.0 <4.3.1`.
- **Why an override:** same shape as the two before it. `@commitlint/cli` is already latest, and the `cosmiconfig` under it declares `js-yaml: ^4.1.0`, which the patched `4.3.1` already satisfies, so the stale copy is purely a lockfile pin. Bumping the parent cannot lift it either: `cosmiconfig@10`, the current latest, still declares the same `^4.1.0`. Note `js-yaml@5.x` exists but is outside that range, so `^4.3.1` is the highest usable. Do not reach for `bun update js-yaml`: it adds js-yaml as a direct dependency at `5.x` and leaves the vulnerable transitive copy in place.
- **Risk:** low. It parses commitlint's own config at commit time and shadcn's registry responses, neither of which takes untrusted input here, and `4.3.1` is a patch release of the range already in use.
- **Exit criteria:** remove once `cosmiconfig` (via `@commitlint/cli`) resolves `js-yaml >=4.3.1` on its own.

## Retired overrides

Kept as a record so a returning advisory is recognised rather than re-investigated from scratch.

- **`nanoid`** ([GHSA-2v37-7h3g-55p8](https://github.com/advisories/GHSA-2v37-7h3g-55p8), high): a custom alphabet generator loops indefinitely when `size` is zero, affecting `nanoid <3.3.17`. **No override was ever in place, and none is needed.** Recorded because the obvious fixes are all wrong here.
  - Only one copy was ever in range: `postcss`'s `nanoid@3.3.16`. `web/next` depends on nanoid directly (`catalog: ^6.0.1`, used by `customAlphabet` in `src/lib/utils.ts` for `slugify`) and `@scalar/types` declares `^5.1.6`; neither range admits `3.3.x`, so neither was affected.
  - **What cleared it:** `postcss@8.5.23` declares `nanoid: "^3.3.16"`, which already admits the patched `3.3.18`, so the vulnerable copy was only a stale lockfile pin. `bun audit fix` (Bun 1.4) bumped that one resolution in-range with no manifest change; it landed in #801.
  - **Do not reach for a bare `"nanoid": "^3.3.17"` override.** Bun applies a bare override to every copy in the tree, which drags the app's own runtime dependency down three majors and Scalar's down two. A nested `"postcss": { "nanoid": ... }` is not an answer either: Bun does not record a nested override, so it resolves to nothing at all.
  - **Do not reach for `bun update postcss`.** It moves the root copy to `8.5.26` and leaves `@tailwindcss/postcss`, `next` and `shadcn` each pinning their own `postcss@8.5.23`, so one shared vulnerable copy becomes three. Deleting the `postcss/nanoid` line and reinstalling is worse still: `bun audit` then passes because the lockfile no longer names the resolution, while `nanoid@3.3.16` is still physically installed. That is a false green.
  - **Verify with `grep -o '"nanoid@[^"]*"' bun.lock | sort -u`** (must list `3.3.18`, `5.1.16` and `6.0.1`) and `ls -d node_modules/.bun/nanoid@*`, which must not contain `3.3.16`. Check the tree, not just the audit.
  - **Exit criteria:** none to remove. If it returns, re-read this entry before touching `package.json`.
- **`fast-uri` → `^3.1.4`** ([GHSA-v2hh-gcrm-f6hx](https://github.com/advisories/GHSA-v2hh-gcrm-f6hx), high). Held up for `@commitlint/cli` (`ajv`) and `shadcn`. Both reached `fast-uri@3.1.4` on their own, meeting the recorded exit criterion, and the override was retired. A later advisory ([GHSA-7p8r-x3mc-p8w7](https://github.com/advisories/GHSA-7p8r-x3mc-p8w7)) then put `3.1.4` back in range and it was overridden a second time at `^3.1.5`; that one is retired below too. This entry is what made the second round recognisable rather than a fresh investigation.
- **`brace-expansion` → `^5.0.9`** ([GHSA-rgw5-rvv9-x895](https://github.com/advisories/GHSA-rgw5-rvv9-x895), high). Held up for `ts-morph`'s `minimatch` chain, which declared `^5.0.8`; a normal dependency refresh moved the tree past `5.0.9`, meeting the recorded exit criterion, and the override went with it in `chore: update deps` (50e262df).
- **`fast-uri` → `^3.1.5`** ([GHSA-7p8r-x3mc-p8w7](https://github.com/advisories/GHSA-7p8r-x3mc-p8w7), high). The second round on this package, held up for `ajv` (via `@commitlint/cli`) and `shadcn`. Both reached `>=3.1.5` on their own and it was retired in the same refresh.
- **`shell-quote` → `^1.10.0`** ([GHSA-395f-4hp3-45gv](https://github.com/advisories/GHSA-395f-4hp3-45gv), high). Held up for `concurrently`, which now resolves `shell-quote@1.9.0`, past the `<=1.8.4` affected range.
- **`esbuild` → `^0.28.1`**. Retired by decision, not because a parent caught up, so this one is an accepted exposure rather than a resolved one.
  - It was added for [GHSA-gv7w-rqvm-qjhr](https://github.com/advisories/GHSA-gv7w-rqvm-qjhr) (high), **withdrawn on 2026-06-17** for naming the wrong package: the flaw was in esbuild's Deno distribution, not the npm one. Verified withdrawn, `bun audit` no longer reports it at any level with the override gone.
  - What removing it costs: `drizzle-kit@0.31.10` still reaches the legacy `@esbuild-kit/esm-loader` → `@esbuild-kit/core-utils` chain, which pins `esbuild ~0.18.20`, so the tree carries `0.18.20` beside the patched `0.25.12` and `0.28.1`. That copy is in range for [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99) (**moderate**): esbuild's dev server answers any website's cross-origin request and returns the response. Affects `esbuild <=0.24.2`.
  - **Why that is acceptable:** the affected surface is `esbuild serve`, which nothing here starts. `drizzle-kit` uses the loader to read `drizzle.config.ts`, and `bun run dev` serves through Next and Hono. The advisory is moderate, so `bun audit --audit-level high` (the pre-push gate) stays green.
  - **Reinstate the override** if anything in the repo starts running esbuild's own dev server, or if this advisory is ever re-rated high.
  - `fumadocs-mdx@15.2.0` requires `^0.28.1` on its own and never needed the override; `drizzle-kit`'s direct range (`^0.25.4`) is clear too. The `@esbuild-kit/*` chain was the only thing it still held up.
