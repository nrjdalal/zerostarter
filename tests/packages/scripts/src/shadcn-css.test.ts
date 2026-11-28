import { afterEach, beforeEach, expect, test } from "bun:test"
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

import {
  LOCAL_IMPORT,
  PACKAGE_IMPORT,
  vendorShadcnCss,
} from "../../../../packages/scripts/src/shadcn-css"

let web: string

const file = (path: string, text: string) => {
  mkdirSync(join(web, dirname(path)), { recursive: true })
  writeFileSync(join(web, path), text)
}

const read = (path: string) => readFileSync(join(web, path), "utf8")

// A stand-in for the shadcn package that sync:shadcn's init installs: its exports map, licence and tailwind.css.
const shadcn = (license = "MIT License\n\nCopyright (c) 2023 shadcn\n") => {
  file(
    "node_modules/shadcn/package.json",
    JSON.stringify({
      name: "shadcn",
      version: "9.9.9",
      exports: { "./tailwind.css": "./dist/tailwind.css" },
    }),
  )
  file("node_modules/shadcn/LICENSE.md", license)
  file("node_modules/shadcn/dist/tailwind.css", "@custom-variant data-open {}\n")
}

beforeEach(() => {
  web = realpathSync(mkdtempSync(join(tmpdir(), "shadcn-css-")))
})

afterEach(() => {
  rmSync(web, { force: true, recursive: true })
})

test("vendors the installed tailwind.css with its version, licence and copyright", async () => {
  shadcn()
  file("src/app/globals.css", `@import "tailwindcss";\n${LOCAL_IMPORT}\n`)
  await vendorShadcnCss(web)
  expect(read("src/app/shadcn.css")).toBe(
    "/* Vendored from shadcn@9.9.9, https://github.com/shadcn-ui/ui/blob/shadcn@9.9.9/packages/shadcn/src/tailwind.css. MIT License, Copyright (c) 2023 shadcn. bun run sync:shadcn rewrites this file. */\n@custom-variant data-open {}\n",
  )
  expect(read("src/app/globals.css")).toBe(`@import "tailwindcss";\n${LOCAL_IMPORT}\n`)
})

test("points init's package import at the local copy", async () => {
  shadcn()
  file("src/app/globals.css", `@import "tailwindcss";\n${PACKAGE_IMPORT}\n\n@theme inline {}\n`)
  await vendorShadcnCss(web)
  expect(read("src/app/globals.css")).toBe(
    `@import "tailwindcss";\n${LOCAL_IMPORT}\n\n@theme inline {}\n`,
  )
})

test("drops init's re-added package import when the local one is already there, so one copy stays", async () => {
  shadcn()
  file("src/app/globals.css", `@import "tailwindcss";\n${PACKAGE_IMPORT}\n${LOCAL_IMPORT}\n`)
  await vendorShadcnCss(web)
  expect(read("src/app/globals.css")).toBe(`@import "tailwindcss";\n${LOCAL_IMPORT}\n`)
})

test("fails when globals.css imports neither", async () => {
  shadcn()
  file("src/app/globals.css", `@import "tailwindcss";\n`)
  await expect(vendorShadcnCss(web)).rejects.toThrow("is in")
})

test("fails when shadcn's licence is no longer the MIT License", async () => {
  shadcn("Apache License\n")
  file("src/app/globals.css", `${LOCAL_IMPORT}\n`)
  await expect(vendorShadcnCss(web)).rejects.toThrow("not the MIT License")
})

test("two syncs in a row leave one import line and one copy, and remove the installed package", async () => {
  const keyframes = "@keyframes accordion-down {}\n"
  for (const round of [1, 2]) {
    shadcn()
    file("node_modules/shadcn/dist/tailwind.css", keyframes)
    // what init does each round: puts its package import back above the theme
    const css =
      round === 1 ? `@import "tailwindcss";\n${PACKAGE_IMPORT}\n` : read("src/app/globals.css")
    file(
      "src/app/globals.css",
      round === 1
        ? css
        : css.replace('@import "tailwindcss";\n', `@import "tailwindcss";\n${PACKAGE_IMPORT}\n`),
    )
    await vendorShadcnCss(web)
  }
  const globals = read("src/app/globals.css")
  expect(globals.split(LOCAL_IMPORT).length - 1).toBe(1)
  expect(globals).not.toContain(PACKAGE_IMPORT)
  expect(read("src/app/shadcn.css").split("@keyframes accordion-down").length - 1).toBe(1)
  expect(existsSync(join(web, "node_modules/shadcn"))).toBe(false)
})

test("fails, and keeps the old copy, when the installed shadcn has no tailwind.css", async () => {
  shadcn()
  rmSync(join(web, "node_modules/shadcn/dist/tailwind.css"))
  file("src/app/shadcn.css", "old\n")
  file("src/app/globals.css", `${PACKAGE_IMPORT}\n`)
  await expect(vendorShadcnCss(web)).rejects.toThrow()
  expect(read("src/app/shadcn.css")).toBe("old\n")
  expect(read("src/app/globals.css")).toBe(`${PACKAGE_IMPORT}\n`)
})

test("fails when shadcn no longer exports tailwind.css", async () => {
  shadcn()
  file(
    "node_modules/shadcn/package.json",
    JSON.stringify({ name: "shadcn", version: "9.9.9", exports: {} }),
  )
  file("src/app/globals.css", `${PACKAGE_IMPORT}\n`)
  await expect(vendorShadcnCss(web)).rejects.toThrow("does not resolve")
})
