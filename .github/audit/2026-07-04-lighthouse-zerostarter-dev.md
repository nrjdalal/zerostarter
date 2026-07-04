# Lighthouse audit: zerostarter.dev (2026-07-04)

Source: `npx lightscore@latest zerostarter.dev` (Lighthouse Node API, 3-run median). Findings below were confirmed against the live site by scanning the rendered DOM for contrast and reading the resource waterfall, not taken from the summary alone.

## Scores

| Category       | Mobile | Desktop |
| -------------- | ------ | ------- |
| Performance    | 92     | 100     |
| Accessibility  | 96     | 96      |
| Best Practices | 100    | 100     |
| SEO            | 100    | 100     |

Headline: the only universal defect is `color-contrast`. The performance gaps are almost entirely mobile-CPU throttling amplifying client-side JS, which is why desktop scores 100.

## Accessibility

### A1 (fix) — `color-contrast: 0%`, both viewports

Lighthouse's contrast audit is pass/fail, so one failing element zeroes it. The rendered-DOM scan (dark theme, the default render) traced it to a single color: the syntax highlighter's comment token `#6a737d` (rgb 106,115,125) from shiki's `github-dark` theme, used in the landing code snippets. It falls under the 4.5:1 AA minimum in two places:

- `3.72:1` on the code card `#171717` (e.g. `# web :3000 · api :4000`)
- `4.11:1` on the page background `#0a0a0a` (e.g. `# sign an agent in, drive the app`, `// fully typed { data, error }`)

Everything else on the page passes; these two combos alone drag the audit to 0%.

Fix: nudge the shiki comment token lighter (or darken the code card enough to clear 4.5:1) so the greyed comment lines meet AA. Lifts accessibility toward 100.

## Performance (mobile-bound)

Measured from the live waterfall: ~1.0 MB transfer, 31 scripts, largest JS chunk 442 KB decoded.

### P1 (proposal) — main-thread work: `mainthread-work-breakdown` 3.1 s, `total-blocking-time` 210 ms, `interactive` 7.6 s, `max-potential-fid` 190 ms

Biggest driver is the animated grain-gradient backdrop (`web/next/src/components/marketing/background-gradient.tsx`): a WebGL shader rendered off-DOM and copied into a 2D canvas every frame at 30 fps, plus hydration of three client marketing components (`background-gradient`, `landing-background`, `api-status`) and PostHog init. Desktop CPU absorbs it (100); mobile's 4x throttle cannot.

Fix (tradeoff): gate the animation on `prefers-reduced-motion` and pause it when off-screen. The backdrop is a deliberate brand flourish (PR #621), so this is a judgment call, not a clear win.

### P2 (fix) — fonts: ~193 KB preloaded but unused on the landing

`caveat` (~73 KB) and `newsreader` (~120 KB) preload on every page because `next/font/local` defaults to `preload: true` and the font variables are applied at the root, but they are only used on `/hire` and `/resume`. The landing renders none of their glyphs.

Fix: set `preload: false` on the `caveat`/`newsreader` declarations in `web/next/src/lib/fonts.ts` (or scope them to their routes). Drops ~193 KB off the landing with no visual change.

### P3 — `unused-javascript` 325 KB, `legacy-javascript-insight` 54 KB

PostHog (loaded eagerly in `web/next/src/app/providers.tsx`) plus the first-load framework/vendor bundle ship code the static landing never exercises; legacy JS is transpiled/polyfilled output sent to modern browsers. Revisit the analytics load strategy and the build target/browserslist.

### P4 — `render-blocking-insight` 270 ms (mobile) and `largest-contentful-paint` 2.9 s

Two render-blocking CSS files (~40 KB) delay first paint; the hero `<h1>` (the LCP element) then waits on that CSS, the DM Sans font, and hydration.

### P5 — `cache-insight` ~62 KB

A few assets (most likely the analytics script or a handful of marketing responses) are served without a long, immutable cache TTL.

## Priority

1. **A1** color-contrast (shiki comment token) — universal, small, clear win.
2. **P2** drop the unused marketing-font preloads on the landing — low-risk, ~193 KB.
3. **P1** reduced-motion / off-screen gating for the grain backdrop — biggest mobile lever, but a brand tradeoff.
4. **P3-P5** analytics load, build target, and cache TTLs — smaller, follow-up.
