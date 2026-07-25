# Unit-test the pure web seams

- Status: backlog
- Links: PR #691 review; PR #754 review

`web/next/src/lib/content.ts` is the load-bearing gate for docs/blog/console (`enabled`, `getPageOr404`, `pages`, `params`, `tree`), but it has no unit tests; PR #691 verified it via browser + authenticated-SSR e2e instead, matching this repo's convention of no web unit-test harness yet.

When a web test harness lands (see the deferred cafe `web/next` test port), assert `contentSource(kind)` against a mocked `features`: `enabled` follows the flag, `getPageOr404` 404s when off (and for blog gates unpublished posts via `isPublicBlogPage`), and `pages()`/`params()`/`tree()` return empty when off. That one seam backs every gated surface, so it is the highest-leverage place to add the first web unit tests.

## Data-table layout math (PR #754)

The data table's layout math is no longer part of this gap: `measureLabelPx`, `autoWidthUnits`, `applyColumnManager`, and the slack rule moved to `web/next/src/lib/data-table-layout.ts` and are covered in `tests/web/next/src/lib/`. That was worth a module boundary because the functions are genuinely pure and decide every rendered width; the same trade was declined for a router's validation schema, which would have meant a file per schema (see `shared-contracts-package.md`).

What still needs a harness is anything that has to render: the `DataTable` region itself (virtualization, the load-more effect, the error and empty branches), `DataTableCellText`'s truncation measurement, and the toolbar and faceted-filter interactions. Those are verified in a browser today.

Api-side helpers are reachable only once they sit outside a router (importing one boots the db client and Better Auth, which throws on CI's dummy secret): `lib/sql.ts` is tested under `tests/api/hono/src/lib/`, while the router's own validation schema is not, since a file per schema is fragmentation the test runner does not justify. See `shared-contracts-package.md`.
