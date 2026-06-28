---
name: design
description: Follow and maintain the app's UI design conventions in DESIGN.md. Use when doing any UI, styling, or component work, when choosing spacing, color, cursor, layout, or typography, when adding or restyling a component, or when making a design-system decision.
---

# Design Conventions

`DESIGN.md` at the repo root is the canonical, prescriptive record of this app's UI conventions: principles (defaults-first), the cursor rule, the spacing scale, color tokens, headings and landmarks, and component defaults, plus a list of open decisions. The descriptive evidence is the CSS/UI audit under `.github/audit/`.

## Workflow

1. Before any UI or styling change, read `DESIGN.md` and follow it.
2. Reach for component defaults first; add classes only where a specific spot genuinely needs one.
3. If a change establishes or alters a convention, update `DESIGN.md` in the same change (docs must not drift).
4. For a genuinely new design-token choice (width, spacing, type scale, variant), propose it before committing; the maintainer owns the design language. Move it from "Open decisions" into the relevant section once decided.
5. `components/ui/*` is shadcn-managed: customize only via `.github/scripts/shadcn-customize.ts`, never by editing `ui/` directly.
