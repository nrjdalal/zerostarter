# Consolidate OG rendering behind one seam

- Status: backlog
- Links: #485; 2026-07-12 architecture review (deep-module lens)

Two levels, same seam.

Narrow (#485): `web/next/src/app/og/home/route.tsx` calls only `renderOgElement` and hand-rebuilds the scaffold `renderOgImage` already owns (same background gradient, the title gradient with `backgroundClip`, the description block), so brand changes must be made in two places. Parameterize `renderOgImage` (`align`, optional `label`, `titleFontSize`) and have the home OG route call it.

Broad (architecture review): the OG contract is smeared. `1200x630` is hardcoded in 6+ places (`lib/og-image.tsx`, `lib/fumadocs.tsx`, the docs and blog layouts, the marketing pages), the `/og/{kind}/{slug}?t=` URL scheme is built in `fumadocs.tsx` while the images are rendered in `og-image.tsx` (two owners of one contract), and the `og/docs` and `og/blog` routes are near-identical. Deepen into `ogForPage(kind, slug)` owning the size, the URL scheme, and the defaults; the metadata builder imports the same size/URL helper, and `og/docs` plus `og/blog` collapse into one parameterized route.

Pairs with [content-source-consolidation](content-source-consolidation.md). Small to medium effort.
