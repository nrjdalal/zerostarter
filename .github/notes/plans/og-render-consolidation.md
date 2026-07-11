# Route the home OG image through renderOgImage

- Status: backlog
- Links: #485

`web/next/src/app/og/home/route.tsx` calls only `renderOgElement` and hand-rebuilds the scaffold `renderOgImage` already owns (same background gradient, the title gradient with `backgroundClip`, the description block), so brand changes must be made in two places. Fix: parameterize `renderOgImage` (`align`, optional `label`, `titleFontSize`) and have the home OG route call it. Small effort.
