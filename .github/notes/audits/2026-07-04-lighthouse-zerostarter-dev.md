# Lighthouse audit: zerostarter.dev (2026-07-04, fixes 2026-07-06)

Source: `npx lightscore@latest zerostarter.dev` (Lighthouse Node API, 3-run median). Findings were confirmed against the live site (rendered-DOM contrast scan + resource waterfall), then fixed on `perf/lighthouse-followups`. This doc supersedes the diagnosis-only PR #636.

## Scores (live prod, pre-fix)

| Category       | Mobile | Desktop |
| -------------- | ------ | ------- |
| Performance    | 91-92  | 100     |
| Accessibility  | 96     | 96      |
| Best Practices | 100    | 100     |
| SEO            | 100    | 100     |

The only universal defect was `color-contrast`. Note: a single 2026-07-06 re-run briefly showed mobile Performance 79 / LCP 4.8s, but a confirmation run returned to 91 / LCP 2.9s, so that reading was run variance, not a regression.

## What shipped (perf/lighthouse-followups)

| Finding                                      | Fix                                                                                                                                                                                                                                                                               | Result                                                                       |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **A1** color-contrast 0%                     | Dark-only shiki `colorReplacements` on the comment token `#6a737d` → `#8b949e` (`(marketing)/page.tsx`); ~5.8:1 on the card, ~6.4:1 on the bg                                                                                                                                     | **Accessibility 96 → 100** (local prod build, both viewports)                |
| **P2** ~193KB unused font preloads           | Moved `caveat`/`newsreader` out of the shared `lib/fonts.ts` (imported by the root layout, so it preloaded on every page) into their own `lib/marketing/fonts.ts`, imported only by `/hire` and `/resume`; next/font scopes each font's preload to the routes that instantiate it | ~193KB off the landing critical path; still preloaded on `/hire`,`/resume`   |
| **P1** main-thread from decorative backdrops | Defer `BackgroundGradient` + `LandingBackground` to a client-only mount via `next/dynamic({ ssr:false })` (`components/marketing/backdrops.tsx`)                                                                                                                                  | Out of SSR/initial hydration window; landing stays static; no visible change |

Preview measurement (Vercel, `perf/lighthouse-followups`, before P3 was pulled): mobile Performance 91 → 99, Accessibility 96 → 100, LCP 2.9 → 2.0s. (SEO 66 on the preview is the Vercel `x-robots-tag: noindex` artifact, not a real change; prod stays 100.)

## Deferred (not in this pass)

- **P4 / render-blocking CSS (~40KB, 280ms):** scoping the two `fumadocs-ui/css/*` imports out of the root `globals.css` onto the docs route group. Skipped because the LCP scare was variance (LCP is a healthy 2.9s) and it carries a coupling risk: the landing's shiki code blocks get their color from fumadocs' `.shiki { color: var(--shiki-dark) }` rule, so the split must re-add that rule or the snippets render colorless. Worth its own careful PR if we chase the 280ms.
- **P3 / JS weight:** deferring PostHog off first load (unused-JS 325KB) and a modern `browserslist` floor (legacy-JS 54KB) were pulled from this pass. Both carry product tradeoffs (analytics undercount of instant bounces; dropped old-browser support), so they get their own decision later. `browserslist` is left at `defaults` for now.
- **P1 backdrop, further:** IntersectionObserver scroll-pause for the grain (currently pauses only on tab-hidden), and skipping `LandingBackground`'s DOM grid under `prefers-reduced-motion`. Both change runtime/visible behavior for some users; deliberate brand calls.
- **P5 / ~62KB assets without long TTL:** a long-TTL + `stale-while-revalidate` `Cache-Control` for `/marketing/:path*`. Pulled from this pass: the assets are stable-named (not content-hashed), so it needs its own decision on the caching/revalidation tradeoff and where it lives (`next.config.ts` vs `vercel.json`).

Once P3, P4, P5, and the P1 extras are decided, delete this doc per the `.github/notes/audits/` convention.
