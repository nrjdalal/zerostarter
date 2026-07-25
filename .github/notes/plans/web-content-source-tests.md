# Unit-test the pure web seams

- Status: backlog
- Links: PR #691 review; PR #754 review

`web/next/src/lib/content.ts` is the load-bearing gate for docs/blog/console (`enabled`, `getPageOr404`, `pages`, `params`, `tree`), but it has no unit tests; PR #691 verified it via browser + authenticated-SSR e2e instead, matching this repo's convention of no web unit-test harness yet.

When a web test harness lands (see the deferred cafe `web/next` test port), assert `contentSource(kind)` against a mocked `features`: `enabled` follows the flag, `getPageOr404` 404s when off (and for blog gates unpublished posts via `isPublicBlogPage`), and `pages()`/`params()`/`tree()` return empty when off. That one seam backs every gated surface, so it is the highest-leverage place to add the first web unit tests.

## Data-table layout math (PR #754)

The same harness gap blocks the data table's pure functions, which decide rendered layout and were verified once by hand:

- `measureLabelPx` / `autoWidthUnits` (`web/next/src/components/data-table.tsx`): the kerning-pair sum, the `average` fallback for an unmapped char, and the 3-unit snap. The generator already asserts its emitted metrics against real font shaping, so what is untested is the consumer, not the data.
- `applyColumnManager`: flex reach-back (`index <= lastFlex`) and the `auto` flag on widthless columns.
- The `flexAt` ownership rule in `DataTable`: last visible capable column grows, growth hands backward when that column hides, and a flex-less table spreads its `auto` columns. This reads correct and will regress silently.

`escapeLike` (`api/hono/src/routers/admin.ts`) needs no web harness and could be tested first, wherever api-side unit tests land.
