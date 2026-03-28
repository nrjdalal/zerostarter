# bun audit

> bun audit --level high

## Overrides

- `path-to-regexp` — overridden to `^8.4.0` (fixes DoS via sequential optional groups, GHSA-j3q9-mxjg-w52f). Transitive dep from fumadocs-core and shadcn.
- `picomatch` — overridden to `^4.0.4` (fixes ReDoS via extglob quantifiers, GHSA-c2c7-rcm5-vvqj). Transitive dep from fumadocs-mdx, lint-staged, tsdown, shadcn, fumadocs-core, and globby.

## Remaining (moderate, not overridden)

- `yaml` — moderate (GHSA-48c2-rrv3-qjmp, Stack Overflow via deeply nested collections). Transitive dep from lint-staged. Will resolve when lint-staged updates yaml dependency.
- `brace-expansion` — moderate (GHSA-f886-m6hf-6m8v, process hang via zero-step sequence). Transitive dep from shadcn. Will resolve when shadcn updates brace-expansion dependency.
- `esbuild` — moderate (GHSA-67mh-4wv8-2f99, dev server request forwarding). Transitive dep from drizzle-kit and fumadocs-mdx. Dev-only dep, not shipped to production. Will resolve when drizzle-kit/fumadocs-mdx update their esbuild dependency.

## Notes

- `fumadocs-core`, `fumadocs-ui` — pinned to `16.7.1`. Versions `16.7.2`+ introduce a breaking change causing "Element type is invalid" errors during static page generation.
