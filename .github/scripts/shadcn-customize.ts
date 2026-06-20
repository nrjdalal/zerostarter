import { execFileSync } from "node:child_process"
import { readFileSync, rmSync, writeFileSync } from "node:fs"

import { Node, Project, SyntaxKind } from "ts-morph"

// Re-applies every local override after `shadcn-update.sh` wipes ui/ and re-scaffolds the app.
// Two strategies:
//   restore — files we own outright; shadcn's version carries nothing we want, so reset to HEAD.
//   patch   — registry components we extend; ts-morph locates the TSX nodes by shape (not text) so
//             attribute/param reordering can't break them; the lone globals.css value is a guarded
//             string swap (a single stable line isn't worth a CSS parser).
// Each patch is idempotent and throws if its target is absent, so a shadcn shape change fails the
// sync loudly instead of silently dropping an override. A single oxfmt pass runs after.

const log = (msg: string) => console.log(`[shadcn-customize] ${msg}`)

const UI = "web/next/src/components/ui"
const BUTTON = `${UI}/button.tsx`
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

// `add -a` force-bumps react-day-picker to v10 in node_modules; the restored lock pins ^9, so drop
// the v10 tree and let the wrapper's `bun i` reinstall v9 (a plain install won't downgrade it).
for (const dir of ["node_modules/react-day-picker", "web/next/node_modules/react-day-picker"]) {
  rmSync(dir, { recursive: true, force: true })
}
log("dropped react-day-picker node_modules (restored lock pins ^9)")

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

// globals.css: brand font role (init repoints --font-sans at its own Inter variable). One stable,
// uniquely-anchored line, so a guarded string swap is enough; no CSS parser warranted.
function patchGlobals() {
  const css = readFileSync(GLOBALS, "utf8")
  const FROM = "--font-sans: var(--font-sans);"
  const TO = "--font-sans: var(--font-dm-sans), sans-serif;"
  if (css.includes(TO)) {
    log(`already applied: ${GLOBALS}`)
    return
  }
  if (!css.includes(FROM))
    throw new Error("shadcn-customize: --font-sans anchor not found in globals.css; shape changed")
  writeFileSync(GLOBALS, css.replace(FROM, TO))
  log(`patched: ${GLOBALS}`)
}

patchButton()
patchSpinner()
patchSidebar()
patchGlobals()
