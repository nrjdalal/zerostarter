# Modern web guidance follow-ups that need a call

- Status: icebox
- Links: the Modern Web Guidance audit (#907), the PR that fixed the rest of it

## The concern

The audit in #907 had 25 findings. The fix PR shipped the keyboard and focus fixes, the skip link and landmarks, the security headers, the link roles, the `/hire` font preloads, the `color-scheme` meta, the overlay zoom under reduced motion and the six `toSorted` swaps. These stayed out, because each needs a design, product or upstream decision rather than a mechanical fix:

- **A script CSP.** The web app now sends `base-uri 'none'; frame-ancestors 'none'; object-src 'none'`, which needs no nonce. A nonce-based `script-src 'nonce-...' 'strict-dynamic'` needs a Next proxy that mints a nonce per request, so every page renders per request and none stays static. The guide says to start it in report-only mode.
- **Code-block comment contrast.** The default `github-light` and `github-dark` themes color comments `#6a737d`: 4.26:1 on the light block and 3.65:1 on the dark one, under 4.5:1. The fix is another theme pair or an override of the comment token, which changes how every code block looks.
- **Callout text contrast.** Fumadocs' neutral palette puts `#737373` on `#f1f1f1` in callouts in light mode (4.19:1). The fix is a darker muted token or a lighter callout background, a design-token change the `design` skill leaves to the maintainer.
- **A pause button on the marquee.** The marquee loops for good and pauses on hover and `focus-within`, which the `design` skill names as the pause affordance. WCAG 2.2.2 asks for a control; adding a visible button is a design change to the landing page.
- **The sidebar's hidden scrollbar.** `no-scrollbar` on the shadcn sidebar hides the scrollbar of a list that scrolls. Showing it, or a thin themed one, changes the sidebar's look.
- **Native `<dialog>` and scroll lock.** Base UI dialogs lock scroll with `overflow: hidden` on `<body>`. Moving to a native modal `<dialog>` with `overscroll-behavior: contain` means replacing the `ui/*` overlay primitives the shadcn sync owns.
- **The DM Sans italic preload.** `next/font` preloads every face of one `localFont`, so the italic file loads on pages with no italic text. Moving italic into its own `localFont` with `preload: false` gives it a different family name, so `font-style: italic` text would get a synthesized oblique instead of the real face. The fix needs a choice: keep the preload, drop the real italic, or load the face by hand.
- **The mobile sidebar sheet.** While the sheet is open, Base UI hides the page behind it from screen readers but keeps any element that holds an `aria-live` region visible, so announcements still reach the user. Fumadocs puts `aria-live` on its "Copy Anchor Link" and "Copy Text" buttons, so those five stay in the accessibility tree. The fix belongs in Fumadocs or Base UI.
- **The console docs landmarks.** In the console, the shell's `<main>` holds the Fumadocs page, which renders its own `<main>`, so `/console/docs` still has two. The audit checked the public docs and blog, which now have one.

## Open question

For each item, whether to fix it, and how. A recorded "no" closes an item as well as a fix does.
