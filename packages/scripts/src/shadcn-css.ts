import { rm } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"

// shadcn init adds `@import "shadcn/tailwind.css"` and the shadcn dependency. The app keeps its own copy of that file instead, so it needs no shadcn dependency: this rewrites the copy from the shadcn package init installed, points globals.css at it, and removes that package.
export const PACKAGE_IMPORT = '@import "shadcn/tailwind.css";'
export const LOCAL_IMPORT = '@import "./shadcn.css";'

export async function vendorShadcnCss(web: string) {
  let source: string
  try {
    source = Bun.resolveSync("shadcn/tailwind.css", resolve(web))
  } catch {
    throw new Error(
      `shadcn-css: shadcn/tailwind.css does not resolve from ${web}; init installs shadcn, so check its exports before vendoring`,
    )
  }
  const root = dirname(dirname(source))
  const { version } = await Bun.file(join(root, "package.json")).json()
  const license = await Bun.file(join(root, "LICENSE.md")).text()
  const name = license.split("\n")[0]?.trim()
  const copyright = license.match(/^Copyright .+$/m)?.[0].trim()
  if (name !== "MIT License" || !copyright)
    throw new Error(
      `shadcn-css: shadcn@${version}'s LICENSE.md is not the MIT License it was; check it before vendoring`,
    )
  const body = await Bun.file(source).text()
  const header = `/* Vendored from shadcn@${version}, https://github.com/shadcn-ui/ui/blob/shadcn@${version}/packages/shadcn/src/tailwind.css. ${name}, ${copyright}. bun run sync:shadcn rewrites this file. */\n`

  const globals = join(web, "src/app/globals.css")
  const lines = (await Bun.file(globals).text()).split("\n")
  const hasLocal = lines.some((l) => l.trim() === LOCAL_IMPORT)
  const kept = lines.filter((l) => l.trim() !== PACKAGE_IMPORT)
  if (!hasLocal) {
    const at = lines.findIndex((l) => l.trim() === PACKAGE_IMPORT)
    if (at === -1)
      throw new Error(`shadcn-css: neither ${PACKAGE_IMPORT} nor ${LOCAL_IMPORT} is in ${globals}`)
    kept.splice(at, 0, LOCAL_IMPORT)
  }

  await Bun.write(join(web, "src/app/shadcn.css"), header + body)
  await Bun.write(globals, kept.join("\n"))
  // The sync's closing bun install leaves the package init linked in node_modules; remove it, so nothing resolves shadcn the lockfile no longer holds.
  await rm(join(web, "node_modules/shadcn"), { force: true, recursive: true })
}
