# TanStack Start migration (blocked on Vercel Bun-runtime deploy)

- Status: in progress
- Links: #650 · branch `web/cutover` · closed PRs #649/#648/#647 (not merged)

The Next.js -> TanStack Start migration is complete and verified locally (golden suite 131/131, ~99.9% visual parity vs the Next baseline, CLI tests 85/85, `tsc` clean); only the production deploy remains. All work lives on branch `web/cutover`. The built app uses Bun's `new ReadableStream({ type: "direct" })` for TanStack Start SSR, so it needs a Bun runtime: Vercel's Node runtime rejects the stream (`source.type` invalid), and the beta Bun runtime streams fine but Nitro's vercel preset does not trace the external `takumi` into the function.

Paths forward: deploy the Docker image on a real Bun host (Fly / Railway / Render) and keep the Hono API on Vercel (recommended), or make the app Node-compatible so it emits standard Web streams.

Loose ends: pick the deploy target, revert or fix `.github/scripts/vercel-runtime.ts` (it left the Vercel preview red), delete the old `NEXT_PUBLIC_*` vars once `VITE_*` is confirmed, and run a real end-to-end confirmation of the Docker image.
