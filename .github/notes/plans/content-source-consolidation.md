# Collapse the content readers into one ContentSource

- Status: backlog
- Links: 2026-07-12 architecture review (deep-module lens)

Docs, blog, and console-docs each re-derive "which collection is this" from URL strings and reimplement "load a page or 404". The pattern `source.getPage(slug); if (!page) notFound()` appears six times (`lib/fumadocs.tsx`, `lib/og-image.tsx`, `lib/blog.ts`, `llms.txt/[[...slug]]/route.ts`), collection identity is sniffed via `slug[0] === "blog"` and `page.url.startsWith("/docs")` in ~6 more, and every new collection forces edits to the `Source` union plus the `if (source === blogSource)` branches in `fumadocs.tsx`. One concept, sprayed across the pipeline.

Deepen into one `contentSource(kind)` module exposing `getPageOr404`, `listPublished`, `params`, `tree`, and `href`, with publish policy, `baseUrl`, and collection identity baked in behind it. Collapses the six duplicated get+404 sites and the prefix-sniffing, and turns "add a collection" from ~8 edits into one entry. Pairs with [og-render-consolidation](og-render-consolidation.md); on the way, derive `BlogPostMeta` from the zod schema and drop the hand-written type plus the `toBlogPostMeta` mapper. Medium-large effort.
