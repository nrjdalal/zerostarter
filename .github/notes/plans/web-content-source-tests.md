# Unit-test the contentSource seam

- Status: backlog
- Links: PR #691 review

`web/next/src/lib/content.ts` is the load-bearing gate for docs/blog/console (`enabled`, `getPageOr404`, `pages`, `params`, `tree`), but it has no unit tests; PR #691 verified it via browser + authenticated-SSR e2e instead, matching this repo's convention of no web unit-test harness yet.

When a web test harness lands (see the deferred cafe `web/next` test port), assert `contentSource(kind)` against a mocked `features`: `enabled` follows the flag, `getPageOr404` 404s when off (and for blog gates unpublished posts via `isPublicBlogPage`), and `pages()`/`params()`/`tree()` return empty when off. That one seam backs every gated surface, so it is the highest-leverage place to add the first web unit tests.
