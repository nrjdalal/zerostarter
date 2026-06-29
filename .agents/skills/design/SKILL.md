---
name: design
description: Follow and maintain the app's UI design conventions. Use when doing any UI, styling, or component work, when choosing spacing, color, cursor, layout, or typography, when adding or restyling a component, or when making a design-system decision.
---

# Design Conventions

The canonical, prescriptive record of this app's UI conventions: what to do. The descriptive evidence (a full CSS/UI audit of the app) lives in `.github/audit/`. When a UI or styling change establishes or alters a convention, update this file in the same change so it never drifts. For a genuinely new design-token choice, propose it first; the design language is owned by the maintainer.

## Principles

- **Defaults first.** Use primitives bare at their defaults. Add a class only where a specific spot genuinely needs it, never as a default-everywhere habit; per-instance overrides are how drift starts. Example: `<Spinner />`, not `<Spinner className="size-5" />`.
- **One source per concern.** Shared styling lives in the component or its variant, not copy-pasted across call sites. Brand identity (name, description, social links) is `@packages/config/site`.

## Cursor

`cursor-pointer` is for navigation only: links, anchors, a Button rendered as `<Link>` or `<a>`, a `router.push`. It signals "this changes the route."

- Do NOT put `cursor-pointer` on action controls (form submit, dialog or menu triggers, toggles, mutation buttons, sign-in, sign-out). They keep the native arrow, even when the action eventually navigates (the standard classifies by element, not side-effect).
- In practice no `cursor-pointer` class is needed at all: `<a href>` shows the pointer natively, `<button>` shows the arrow natively, and `buttonVariants` sets no cursor (matching Tailwind v4 and shadcn, and the CSS spec where pointer means link). A readOnly button-like input (the docs search trigger) uses `cursor-default` to avoid the text I-beam.
- Exception: some primitives set their own cursor (e.g. `DropdownMenuItem` hard-codes `cursor-default`). A navigation item inside one (a `render={<Link/>}` menu item) needs an explicit `cursor-pointer` to restore the pointer, since the base overrides the anchor's native cursor.

## Spacing

- Stay on the Tailwind scale. No off-ladder one-offs (`gap-7.5`, `size-4.5`, `w-45`, `mb-18`, `text-[0.6rem]`); snap to the nearest step.
- `gap-2` is the workhorse for tight clusters.
- Dashboard and console pages use the collapsible `SidebarShell` and wrap their content in `DashboardShell` (`components/dashboard/shell.tsx`): it owns `mx-auto` + width + `p-4 sm:p-6` via a `size` variant (`sm`/`md`/`lg`/`full`, default `md` = `max-w-4xl`). The title/description/actions row is `DashboardHeader`. Don't hand-roll `mx-auto`/`max-w-*`/`p-*` or the header layout.
- Marketing pages share one vertical scale: `py-24` sections and a `px-4 md:px-6` container gutter (hire and resume are aligned to home).

## Typography and headings

- Exactly one `<h1>` per page (the page title). Sections use `<h2>` and below; never skip levels.
- Use the existing type scale and tokens; do not introduce font sizes outside the scale.
- Marketing-page headings (home, hire, resume) are `font-bold`, unified across all three. Sub-headings within a section stay lighter (e.g. a `font-semibold` `h3`) to preserve hierarchy; non-heading display text (a stat value) is not a heading and follows its own weight.

## Color and theming

- Use semantic tokens only: `text-muted-foreground`, `bg-card`, `border-border`, `bg-sidebar`, and friends. No hardcoded hex, rgb, or hsl in classNames or inline styles. The one exception is Satori-rendered OG images, which have no theme context.
- Dark mode is `next-themes` (`attribute="class"`); pair every `dark:` with a token.
- Success uses the `--success` token (green-600 in light, green-500 in dark, mirroring `--destructive`): `text-success`, `bg-success/10`, `border-success/20`. Foreground-less, like `--destructive`.

## Layout and landmarks

- Each top-level page wraps its content in a single `<main>`. Route-group layouts (dashboard via `SidebarShell`, docs, blog) already render their own `<main>`, so do NOT add one to the root layout or you nest landmarks.
- Collapsible app shells go through `SidebarShell`.
- Top-level full-height surfaces (the body, marketing pages, the `SidebarShell` root) use `min-h-svh`, matching the shadcn sidebar; no `dvh`. Surfaces nested inside the shell's content pane (route `error`/`loading`, dashboard/console content) fill it with `flex-1` — the shell `<main>` is `flex min-h-svh min-w-0 flex-1 flex-col`, so don't re-assert `min-h-svh` inside an already-full-height parent.

## Components

- **Loading:** `<Spinner />`, bare, at its default `size-4`. Never hand-roll `RiLoaderLine`.
- **Empty states:** the `Empty` primitive (`EmptyHeader` / `EmptyMedia` / `EmptyTitle` / ...). Do not hand-roll empty messages.
- **Badges and pills:** use `<Badge>` (with a variant, plus className for semantic color like `text-success`) over a hand-rolled rounded-full span. Identity rows (avatar + name + email) use `Item` / `ItemMedia` / `ItemContent`. Exception: the sidebar trigger identity stays hand-rolled inside `SidebarMenuButton` (the chevron is a sibling there).
- **Forms:** native `<form>` then `<FieldGroup>` then `<form.Field>` then `<Field>` + `<FieldLabel>` + `<Input>` + conditional `<FieldError>`, with `@tanstack/react-form` + zod. Let `FieldGroup` own the vertical rhythm (do not stack a second `space-y-*`). Do not hand-roll labels or error markup.
- **Dialogs:** bare `<DialogContent>` is centered at `sm:max-w-sm`. The auth dialog uses `max-w-md`.
- **Icons:** `@remixicon/react` only. `size-4` inside buttons by default.
- **shadcn (`components/ui/*`):** customize only via `.github/scripts/shadcn-customize.ts` (the sync wipes and re-scaffolds `ui/`). Extend the primitive in place; do not fork a copy.

## Open decisions

None open. Resolved decisions are folded into the sections above; add new ones here (propose before committing, then move up once chosen).
