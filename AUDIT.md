# bun audit

> bun audit --level high

No overrides required. All high vulnerabilities resolved by updating dependencies.

## Remaining (moderate, not overridden)

- `esbuild` — moderate (GHSA-67mh-4wv8-2f99, dev server request forwarding). Transitive dep from drizzle-kit and fumadocs-mdx. Dev-only dep, not shipped to production. Will resolve when drizzle-kit/fumadocs-mdx update their esbuild dependency.
