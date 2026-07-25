import { execFileSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"

import { Node, Project, SyntaxKind } from "ts-morph"

// Re-applies every local override after `shadcn-update.sh` wipes ui/ and re-scaffolds the app.
// Two strategies:
//   restore, files we own outright; shadcn's version carries nothing we want, so reset to HEAD.
//   patch  , registry components we extend; ts-morph locates the TSX nodes by shape (not text) so
//             attribute/param reordering can't break them; the lone globals.css value is a guarded
//             string swap (a single stable line isn't worth a CSS parser).
// Each patch is idempotent and throws if its target is absent, so a shadcn shape change fails the
// sync loudly instead of silently dropping an override. A single oxfmt pass runs after.

const log = (msg: string) => console.log(`[shadcn-customize] ${msg}`)

const UI = "web/next/src/components/ui"
const BUTTON = `${UI}/button.tsx`
const CHECKBOX = `${UI}/checkbox.tsx`
const SPINNER = `${UI}/spinner.tsx`
const SIDEBAR = `${UI}/sidebar.tsx`
const GLOBALS = "web/next/src/app/globals.css"

// init/add re-scaffold these with shadcn defaults we keep none of: a next/font/google layout, a
// stripped utils.ts, and catalog->pinned dep drift in package.json/bun.lock. Reset to HEAD.
const RESTORE = [
  "bun.lock",
  "web/next/package.json",
  "web/next/src/app/layout.tsx",
  "web/next/src/lib/utils.ts",
]
execFileSync("git", ["checkout", "HEAD", "--", ...RESTORE], { stdio: "inherit" })
log(`restored from HEAD: ${RESTORE.join(", ")}`)

const project = new Project({
  skipAddingFilesFromTsConfig: true,
  skipFileDependencyResolution: true,
})

// button.tsx: Base UI render wiring (registry ships a plain native button).
function patchButton() {
  const sf = project.addSourceFileAtPath(BUTTON)
  const binding = sf.getFunctionOrThrow("Button").getParameters()[0]?.getNameNode()
  if (!binding || !Node.isObjectBindingPattern(binding))
    throw new Error(
      "shadcn-customize: Button params are not an object pattern; shadcn shape changed",
    )
  if (!binding.getElements().some((e) => e.getName() === "render")) {
    if (!binding.getElements().some((e) => e.getDotDotDotToken()))
      throw new Error("shadcn-customize: no `...props` rest in Button params; shape changed")
    binding.replaceWithText(binding.getText().replace("...props", "render, ...props"))
  }

  const el =
    sf.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement).find(isButtonPrimitive) ??
    sf.getDescendantsOfKind(SyntaxKind.JsxOpeningElement).find(isButtonPrimitive)
  if (!el)
    throw new Error("shadcn-customize: <ButtonPrimitive> not found in button.tsx; shape changed")
  const add = []
  if (!el.getAttribute("nativeButton")) add.push({ name: "nativeButton", initializer: "{!render}" })
  if (!el.getAttribute("render")) add.push({ name: "render", initializer: "{render}" })
  if (add.length) {
    // keep our explicit attrs before `{...props}`, exactly as the committed file has them
    const spread = el.getAttributes().findIndex((a) => Node.isJsxSpreadAttribute(a))
    el.insertAttributes(spread === -1 ? el.getAttributes().length : spread, add)
  }
  sf.saveSync()
  log(`patched: ${BUTTON}`)
}

function isButtonPrimitive(el: { getTagNameNode(): { getText(): string } }) {
  return el.getTagNameNode().getText() === "ButtonPrimitive"
}

// checkbox.tsx: indeterminate. Base UI renders the indicator for checked OR indeterminate but sets data-indeterminate (never data-checked), so the registry's check-only indicator paints a partial selection as a check on an unfilled box; fill the box and swap the glyph to a minus. Both keyed off the data attribute rather than the prop, since Base UI also derives the state itself for a parent checkbox in a CheckboxGroup, where the prop is undefined.
const INDETERMINATE_CLASSES =
  "data-indeterminate:border-primary data-indeterminate:bg-primary data-indeterminate:text-primary-foreground dark:data-indeterminate:bg-primary"
const INDETERMINATE_ICON =
  '<>\n<RiCheckLine className="in-data-indeterminate:hidden" />\n<RiSubtractLine className="hidden in-data-indeterminate:block" />\n</>'

function patchCheckbox() {
  const sf = project.addSourceFileAtPath(CHECKBOX)
  const imp = sf.getImportDeclaration((d) => d.getModuleSpecifierValue() === "@remixicon/react")
  if (!imp)
    throw new Error(
      "shadcn-customize: @remixicon/react import not found in checkbox.tsx; shape changed",
    )
  if (!imp.getNamedImports().some((n) => n.getName() === "RiSubtractLine"))
    imp.addNamedImport({ name: "RiSubtractLine" })

  const root = sf
    .getDescendantsOfKind(SyntaxKind.JsxOpeningElement)
    .find((el) => el.getTagNameNode().getText() === "CheckboxPrimitive.Root")
  if (!root)
    throw new Error(
      "shadcn-customize: <CheckboxPrimitive.Root> not found in checkbox.tsx; shape changed",
    )
  const classes = root
    .getAttribute("className")
    ?.getFirstDescendantByKind(SyntaxKind.CallExpression)
    ?.getArguments()[0]
  if (!classes || !Node.isStringLiteral(classes))
    throw new Error(
      'shadcn-customize: CheckboxPrimitive.Root className is not cn("..."); shape changed',
    )
  if (!classes.getLiteralValue().includes("data-indeterminate:bg-primary"))
    classes.setLiteralValue(`${classes.getLiteralValue()} ${INDETERMINATE_CLASSES}`)

  // the swapped-in markup still contains <RiCheckLine />, so check for the patch before the target
  if (!sf.getFullText().includes("in-data-indeterminate:")) {
    const icon = sf
      .getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement)
      .find((el) => el.getTagNameNode().getText() === "RiCheckLine")
    if (!icon)
      throw new Error("shadcn-customize: <RiCheckLine /> not found in checkbox.tsx; shape changed")
    icon.replaceWithText(INDETERMINATE_ICON)
  }
  sf.saveSync()
  log(`patched: ${CHECKBOX}`)
}

// spinner.tsx: type props off the Remixicon component (registry retypes to "svg").
function patchSpinner() {
  const sf = project.addSourceFileAtPath(SPINNER)
  const imp = sf.getImportDeclaration((d) => d.getModuleSpecifierValue() === "@remixicon/react")
  if (!imp)
    throw new Error(
      "shadcn-customize: @remixicon/react import not found in spinner.tsx; shape changed",
    )
  if (!imp.getNamedImports().some((n) => n.getName() === "RemixiconComponentType"))
    imp.addNamedImport({ name: "RemixiconComponentType", isTypeOnly: true })

  const refs = sf
    .getDescendantsOfKind(SyntaxKind.TypeReference)
    .filter((t) => t.getTypeName().getText() === "React.ComponentProps")
  const svg = refs.flatMap((t) => t.getTypeArguments()).find((a) => a.getText() === '"svg"')
  if (svg) svg.replaceWithText("RemixiconComponentType")
  else if (
    !refs.some((t) => t.getTypeArguments().some((a) => a.getText() === "RemixiconComponentType"))
  )
    throw new Error(
      'shadcn-customize: React.ComponentProps<"svg"> not found in spinner.tsx; shape changed',
    )
  sf.saveSync()
  log(`patched: ${SPINNER}`)
}

// sidebar.tsx: SidebarTrigger gains an optional children label.
function patchSidebar() {
  const sf = project.addSourceFileAtPath(SIDEBAR)
  const binding = sf.getFunctionOrThrow("SidebarTrigger").getParameters()[0]?.getNameNode()
  if (!binding || !Node.isObjectBindingPattern(binding))
    throw new Error(
      "shadcn-customize: SidebarTrigger params are not an object pattern; shape changed",
    )
  if (!binding.getElements().some((e) => e.getName() === "children")) {
    if (!binding.getElements().some((e) => e.getDotDotDotToken()))
      throw new Error(
        "shadcn-customize: no `...props` rest in SidebarTrigger params; shape changed",
      )
    binding.replaceWithText(binding.getText().replace("...props", "children, ...props"))
  }

  const icon = sf
    .getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement)
    .find((el) => el.getTagNameNode().getText() === "RiSideBarLine")
  if (!icon)
    throw new Error("shadcn-customize: <RiSideBarLine /> not found in sidebar.tsx; shape changed")
  const already = icon
    .getParentIfKind(SyntaxKind.JsxElement)
    ?.getJsxChildren()
    .some((c) => Node.isJsxExpression(c) && c.getExpression()?.getText() === "children")
  if (!already) sf.insertText(icon.getEnd(), "\n{children}")
  sf.saveSync()
  log(`patched: ${SIDEBAR}`)
}

// globals.css: two brand overrides init reverts. --font-sans repoints at its own Inter variable;
// --sidebar gets hardcoded light/dark defaults where we flush it with --background (PR #566). Both
// are stable, uniquely-anchored lines, so guarded string swaps suffice; no CSS parser warranted.
function patchGlobals() {
  let css = readFileSync(GLOBALS, "utf8")

  const FONT_FROM = "--font-sans: var(--font-sans);"
  const FONT_TO = "--font-sans: var(--font-dm-sans), sans-serif;"
  if (css.includes(FONT_FROM)) css = css.replace(FONT_FROM, FONT_TO)
  else if (!css.includes(FONT_TO))
    throw new Error("shadcn-customize: --font-sans anchor not found in globals.css; shape changed")

  // one --sidebar line in :root, one in .dark; both flush to --background regardless of the default
  const SIDEBAR_LINE = /^(\s*)--sidebar: .+;$/gm
  const sidebarLines = css.match(SIDEBAR_LINE)
  if (!sidebarLines || sidebarLines.length !== 2)
    throw new Error(
      `shadcn-customize: expected 2 --sidebar lines in globals.css, found ${sidebarLines ? sidebarLines.length : 0}; shape changed`,
    )
  css = css.replace(SIDEBAR_LINE, "$1--sidebar: var(--background);")

  writeFileSync(GLOBALS, css)
  log(`patched: ${GLOBALS}`)
}

patchButton()
patchCheckbox()
patchSpinner()
patchSidebar()
patchGlobals()
