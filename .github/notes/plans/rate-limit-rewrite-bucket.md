# The public-suffix /api rewrite bills a Vercel hop, not the client

- Status: icebox
- Links: deepsec audit 2026-09-06 (item 13), PR #819

## The concern

On a `*.vercel.app` web host the browser reaches the API through the web's `/api` rewrite, and the API's rate limiter then bills a bucket that is not the client's, so every visitor of a public-suffix deployment shares one anonymous budget on that path. Observed against the production API (pre-#819 code) while verifying #819: the same request through the `zerostarter.dev` rewrite lands in the client's own bucket, so the last forwarded address on the `*.vercel.app` path is a Vercel hop.

## Context

Pre-existing, not introduced by #819, which keeps keying on `x-forwarded-for` read last hop first. A custom domain calls the API directly and is unaffected. The web's server-side session reads on Vercel key on whatever Vercel stamps for a function-to-function call, which is unverified either way.

## Open question

Whether Vercel stamps the original client anywhere on that path (`x-vercel-forwarded-for`, `x-real-ip`, or the first `x-forwarded-for` entry) is unknown from outside. An echo route on a preview API would settle it; then either the limiter reads that header on Vercel, or public-suffix hosts are documented as sharing a bucket.
