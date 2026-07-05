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
const SPINNER = `${UI}/spinner.tsx`
const SIDEBAR = `${UI}/sidebar.tsx`
const GLOBALS = "web/next/src/app/globals.css"

// init/add re-scaffold these with shadcn defaults we keep none of: our components.json (rsc:false,
// remixicon, the base-nova/menu settings), a stripped utils.ts, catalog->pinned dep drift plus the
// start template's @fontsource-variable/inter (we self-host DM Sans) in the root package.json, and
// dep drift in web/next/package.json + bun.lock. Reset to HEAD.
const RESTORE = [
  "bun.lock",
  "package.json",
  "web/next/package.json",
  "web/next/components.json",
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

// globals.css: our design overrides on the registry base. Guarded string swaps (a few stable,
// uniquely-anchored lines aren't worth a CSS parser):
//   - drop the start template's Inter import and repoint --font-sans at the brand DM Sans var (we
//     self-host via fonts.css). init is non-deterministic here: it sometimes leaves our --font-sans
//     and only re-adds the import, so each edit is independently optional.
//   - keep the seamless sidebar (--sidebar tracks --background, light and dark); the registry ships
//     a distinct oklch value.
function patchGlobals() {
  const before = readFileSync(GLOBALS, "utf8")
  const css = before
    .replace('@import "@fontsource-variable/inter";\n', "")
    .replace(
      '--font-sans: "Inter Variable", sans-serif;',
      "--font-sans: var(--font-dm-sans), sans-serif;",
    )
    .replace(/--sidebar: oklch\([^)]*\);/g, "--sidebar: var(--background);")
  if (css === before) {
    if (
      css.includes("--font-sans: var(--font-dm-sans)") &&
      !css.includes("@fontsource-variable/inter") &&
      !/--sidebar: oklch/.test(css)
    ) {
      log(`already applied: ${GLOBALS}`)
      return
    }
    throw new Error("shadcn-customize: globals.css font/sidebar anchors not found; shape changed")
  }
  writeFileSync(GLOBALS, css)
  log(`patched: ${GLOBALS}`)
}

patchButton()
patchSpinner()
patchSidebar()
patchGlobals()
