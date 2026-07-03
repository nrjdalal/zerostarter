import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { convertRepo, fixDangling } from "@/convert"
import { exists, read, readJson, write } from "@/io"

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "zs-convert-"))
})
afterEach(() => {
  rmSync(dir, { force: true, recursive: true })
})

const FONTS = `import localFont from "next/font/local"

export const dmSans = localFont({ src: "../fonts/dm-sans.woff2" })

export const caveat = localFont({
  src: "../fonts/marketing/caveat-latin-wght-normal.woff2",
  variable: "--font-caveat",
  weight: "400 700",
})

export const newsreader = localFont({
  src: [
    { path: "../fonts/marketing/newsreader-latin-wght-normal.woff2", style: "normal" },
    { path: "../fonts/marketing/newsreader-latin-wght-italic.woff2", style: "italic" },
  ],
  variable: "--font-newsreader",
  weight: "200 800",
})
`

const NAV = `export const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/hire", label: "Hire" },
]
`

const fonts = () => readFileSync(join(dir, "web/next/src/lib/fonts.ts"), "utf8")
const nav = () => readFileSync(join(dir, "web/next/src/components/navbar/home.tsx"), "utf8")

describe("fixDangling", () => {
  const setup = (f: string, n: string) => {
    write(join(dir, "web/next/src/lib/fonts.ts"), f)
    write(join(dir, "web/next/src/components/navbar/home.tsx"), n)
  }

  test("strips caveat/newsreader + the /hire link, keeps dmSans and other links", () => {
    setup(FONTS, NAV)
    fixDangling(dir)
    expect(fonts()).not.toContain("caveat")
    expect(fonts()).not.toContain("newsreader")
    expect(fonts()).toContain("dmSans")
    expect(nav()).not.toContain("/hire")
    expect(nav()).toContain("/dashboard")
  })

  test("is resilient to reformatting (single quotes, deeper indent, minified nav entry)", () => {
    setup(
      FONTS.replaceAll('"', "'").replaceAll("  ", "    "),
      `export const links = [\n  {href:'/hire',label:'Hire'},\n]\n`,
    )
    expect(() => fixDangling(dir)).not.toThrow()
    expect(fonts()).not.toContain("caveat")
    expect(nav()).not.toContain("/hire")
  })

  test("throws on structural drift (a font export renamed)", () => {
    setup(FONTS.replace("const caveat", "const caveatFont"), NAV)
    expect(() => fixDangling(dir)).toThrow(/fonts\.ts/)
  })

  test("no-ops when the starter already dropped the author fonts and /hire (evolution)", () => {
    setup(
      `import localFont from "next/font/local"\n\nexport const dmSans = localFont({ src: "x" })\n`,
      `export const links = [\n    { href: "/dashboard", label: "Dash" },\n]\n`,
    )
    expect(() => fixDangling(dir)).not.toThrow()
    expect(fonts()).toContain("dmSans")
    expect(nav()).toContain("/dashboard")
  })
})

describe("convertRepo (in-place)", () => {
  const scaffold = () => {
    write(
      join(dir, ".gitpickignore"),
      [
        "# custom",
        "LICENSE.md",
        "web/next/content/",
        "packages/config/src/site.ts",
        "# PRESERVE_ON_SYNC - AUDIT.md",
      ].join("\n"),
    )
    write(join(dir, "LICENSE.md"), "MIT")
    write(join(dir, "web/next/content/old.mdx"), "author-only")
    write(join(dir, "packages/config/src/site.ts"), "// upstream site")
    write(
      join(dir, "package.json"),
      JSON.stringify({
        name: "zerostarter",
        version: "1.2.3",
        author: "nrjdalal",
        homepage: "https://zerostarter.dev",
        license: "MIT",
      }),
    )
    write(join(dir, "web/next/src/lib/fonts.ts"), FONTS)
    write(join(dir, "web/next/src/components/navbar/home.tsx"), NAV)
  }

  test("removes the excluded paths and the ignore file itself", () => {
    scaffold()
    convertRepo(dir, { name: "acme" })
    expect(exists(join(dir, "LICENSE.md"))).toBe(false)
    expect(exists(join(dir, ".gitpickignore"))).toBe(false)
    expect(exists(join(dir, "web/next/content/old.mdx"))).toBe(false)
  })

  test("rebrands package.json to the fork name and drops author fields", () => {
    scaffold()
    convertRepo(dir, { name: "Acme App" })
    const pkg = readJson<Record<string, unknown>>(join(dir, "package.json"))
    expect(pkg.name).toBe("acme-app")
    expect(pkg.version).toBe("0.0.0")
    expect(pkg.author).toBeUndefined()
    expect(pkg.homepage).toBeUndefined()
    expect(pkg.license).toBeUndefined()
  })

  test("writes a fresh branded site.ts and content stubs with no upstream identity", () => {
    scaffold()
    convertRepo(dir, { name: "acme" })
    const site = read(join(dir, "packages/config/src/site.ts"))
    expect(site).toContain('name: "Acme"')
    expect(site).not.toContain("upstream site")
    expect(exists(join(dir, "web/next/content/docs/index.mdx"))).toBe(true)
    expect(exists(join(dir, "AGENTS.md"))).toBe(true)
    expect(read(join(dir, "README.md"))).not.toContain("nrjdalal")
  })

  test("reconciles the dangling font exports and /hire link", () => {
    scaffold()
    convertRepo(dir, { name: "acme" })
    expect(fonts()).not.toContain("caveat")
    expect(fonts()).toContain("dmSans")
    expect(nav()).not.toContain("/hire")
  })
})
