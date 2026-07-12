# Derive BlogPostMeta from the blog zod schema

- Status: backlog
- Links: PR #691 review (carved out of the shipped content-source-consolidation)

The content-source-consolidation plan (its seam shipped in #691) named an "on the way" cleanup that was not done, so it is tracked here rather than closed silently: derive `BlogPostMeta` from the blog frontmatter zod schema and drop the hand-written type plus the `toBlogPostMeta` mapper (`web/next/src/lib/blog-policy.ts`, `web/next/src/lib/blog.ts`).

Deliberately deferred, because it is a tradeoff, not a mechanical rename. `blog-policy.ts` is currently pure (zero fumadocs imports); `BlogPostMeta` is the decoupling interface and `toBlogPostMeta` maps a fumadocs page onto it, which keeps the publish policy unit-testable without fumadocs. Deriving the type from `blogSchema` (which lives in the fumadocs-coupled `source.config.ts`) and dropping the mapper would couple the pure policy module to fumadocs, trading testability for less duplication. Decide that on its own merits: keep the decoupling and only DRY the shared field list, versus couple-and-derive. Not worth riding on the feature-flags PR.
