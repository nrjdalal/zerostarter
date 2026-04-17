# bun audit

> bun audit --level high

No overrides required. All high vulnerabilities resolved by updating dependencies.

# Temporary workarounds

## `Promise.withResolvers` polyfill

`takumi-js@1.0.12` (via `@takumi-rs/image-response`) calls `Promise.withResolvers` at OG-image request time. Next 16 prerender workers on `ubuntu-latest` CI can run under Node <22, which lacks the API, so `next build` fails when prerendering `/api/og/*`.

Workaround: side-effect polyfill imported before takumi.

- `web/next/src/lib/polyfill-promise-with-resolvers.ts` (module)
- `web/next/src/lib/og-image.tsx` (import)
- `web/next/src/app/api/og/home/route.tsx` (import)
- `web/next/src/app/api/og/hire/route.tsx` (import)

Remove when one of these is true:

- CI runner default Node is ≥22 across all workflows (check `ubuntu-latest` image release notes).
- takumi-js drops the `Promise.withResolvers` call or polyfills it itself.
- The project pins a Node ≥22 setup step in `.github/workflows/auto-check-build.yml`.

Introduced: commit `f2e9b2f`.
