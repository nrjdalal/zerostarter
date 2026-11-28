# Lighthouse follow-ups that are product tradeoffs

- Status: icebox
- Links: the Lighthouse audit of zerostarter.dev, 2026-07-04 (deleted once folded in here), PR #653 (the fixes that shipped), PR #636 (the diagnosis-only draft it superseded, closed)

## The concern

The audit's fixes shipped: the contrast defect, the two marketing fonts preloading on every page, and the decorative backdrops leaving the hydration window. Measured on the preview, mobile Performance went from 91 to 99, Accessibility from 96 to 100 and LCP from 2.9s to 2.0s. Four follow-ups were pulled out of that pass because each one trades something a visitor or the product sees for a number, and none had been ruled on. The first is now settled by measurement; the other three still describe the code:

- **PostHog on first load, and the browser floor: settled.** PostHog now loads after the page has loaded, off every route's first load. The browser floor moves nothing: Lighthouse 12 on a GitHub runner reports about 14 KB of legacy JavaScript, all of it Next's own seven polyfills in the framework's main chunk, and `defaults`, no `browserslist` key and a floor at version 120 give byte-identical Turbopack output.
- **The fumadocs stylesheets in the root.** `web/next/src/app/globals.css` imports `fumadocs-ui/css/neutral.css` and `preset.css`, about 40KB and 280ms of render-blocking CSS on pages that are not docs. Scoping them to the docs route group has a coupling risk: the landing page's code blocks take their colour from fumadocs' `.shiki` rule, so the split has to re-add that rule or the snippets render colourless.
- **No long cache lifetime on `/marketing` assets.** Neither `next.config.ts` nor `vercel.json` sets a `Cache-Control` for them, about 62KB. The files are stable-named, not content-hashed, so a long lifetime needs an answer for how a replaced image reaches a returning visitor, and a decision on which of the two files owns the rule.
- **The grain off-screen, and the grid under reduced motion.** `background-gradient.tsx` pauses only when the tab is hidden, not when it scrolls out of view. `landing-background.tsx` skips its pointer tracking under `prefers-reduced-motion` but still renders its DOM grid. Both change what some visitors see.

## Context

The LCP scare that made the stylesheet split look urgent was run variance: a single run read 4.8s and the confirmation run returned to 2.9s. With the shipped fixes the site already scores 99 to 100 everywhere, so each item here buys a small number at a visible cost.

## Open question

For each of the four, whether the number is worth what it costs: analytics completeness and old-browser reach, a coupling between the landing page and the docs stylesheet, a staleness window on marketing images, and the brand's motion. A recorded "no" closes an item as well as a fix does.
