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

// TanStack app: fonts.ts holds Tailwind utility aliases, fonts.css holds the @font-face rules and CSS vars.
const FONTS = `// the same names map to Tailwind font utilities generated from the @theme font variables.
export const dmSans = { className: "font-dm-sans" }

export const caveat = { className: "font-caveat" }

export const newsreader = { className: "font-newsreader" }
`

const FONTS_CSS = `@font-face {
  font-family: "DM Sans";
  src: url("../fonts/dm-sans-latin-wght-normal.woff2") format("woff2");
}

@font-face {
  font-family: "Caveat";
  font-style: normal;
  font-weight: 400 700;
  font-display: swap;
  src: url("../fonts/marketing/caveat-latin-wght-normal.woff2") format("woff2");
}

@font-face {
  font-family: "Newsreader";
  font-style: normal;
  font-weight: 200 800;
  font-display: swap;
  src: url("../fonts/marketing/newsreader-latin-wght-normal.woff2") format("woff2");
}

@font-face {
  font-family: "Newsreader";
  font-style: italic;
  font-weight: 200 800;
  font-display: swap;
  src: url("../fonts/marketing/newsreader-latin-wght-italic.woff2") format("woff2");
}

:root {
  --font-dm-sans: "DM Sans";
  --font-caveat: "Caveat";
  --font-newsreader: "Newsreader";
}
`

const NAV = `export const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/hire", label: "Hire" },
]
`

const fonts = () => readFileSync(join(dir, "web/next/src/lib/fonts.ts"), "utf8")
const fontsCss = () => readFileSync(join(dir, "web/next/src/app/fonts.css"), "utf8")
const nav = () => readFileSync(join(dir, "web/next/src/components/navbar/home.tsx"), "utf8")

describe("fixDangling", () => {
  const setup = (f: string, n: string, css = FONTS_CSS) => {
    write(join(dir, "web/next/src/lib/fonts.ts"), f)
    write(join(dir, "web/next/src/app/fonts.css"), css)
    write(join(dir, "web/next/src/components/navbar/home.tsx"), n)
  }

  test("strips caveat/newsreader (ts + css) + the /hire link, keeps dmSans and other links", () => {
    setup(FONTS, NAV)
    fixDangling(dir)
    expect(fonts()).not.toContain("caveat")
    expect(fonts()).not.toContain("newsreader")
    expect(fonts()).toContain("dmSans")
    expect(fontsCss()).not.toContain("fonts/marketing/")
    expect(fontsCss()).not.toContain("Caveat")
    expect(fontsCss()).not.toContain("--font-caveat")
    expect(fontsCss()).not.toContain("--font-newsreader")
    expect(fontsCss()).toContain("DM Sans")
    expect(fontsCss()).toContain("--font-dm-sans")
    expect(nav()).not.toContain("/hire")
    expect(nav()).toContain("/dashboard")
  })

  test("is resilient to reformatting (single quotes, minified nav entry)", () => {
    setup(FONTS.replaceAll('"', "'"), `export const links = [\n  {href:'/hire',label:'Hire'},\n]\n`)
    expect(() => fixDangling(dir)).not.toThrow()
    expect(fonts()).not.toContain("caveat")
    expect(fontsCss()).not.toContain("fonts/marketing/")
    expect(nav()).not.toContain("/hire")
  })

  test("strips CRLF-terminated exports, css blocks, and /hire (Windows/WSL checkout)", () => {
    const crlf = (s: string) => s.replace(/\n/g, "\r\n")
    setup(crlf(FONTS), crlf(NAV), crlf(FONTS_CSS))
    expect(() => fixDangling(dir)).not.toThrow()
    expect(fonts()).not.toContain("caveat")
    expect(fonts()).not.toContain("newsreader")
    expect(fontsCss()).not.toContain("fonts/marketing/")
    expect(nav()).not.toContain("/hire")
  })

  test("throws on structural drift (a marketing font ref the strip misses)", () => {
    setup(FONTS, NAV, `${FONTS_CSS}\n/* leftover url("../fonts/marketing/extra.woff2") */\n`)
    expect(() => fixDangling(dir)).toThrow(/fonts\.css/)
  })

  test("no-ops when the starter already dropped the author fonts and /hire (evolution)", () => {
    setup(
      `export const dmSans = { className: "font-dm-sans" }\n`,
      `export const links = [\n    { href: "/dashboard", label: "Dash" },\n]\n`,
      `@font-face {\n  font-family: "DM Sans";\n  src: url("../fonts/dm-sans.woff2") format("woff2");\n}\n\n:root {\n  --font-dm-sans: "DM Sans";\n}\n`,
    )
    expect(() => fixDangling(dir)).not.toThrow()
    expect(fonts()).toContain("dmSans")
    expect(fontsCss()).toContain("DM Sans")
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
    write(join(dir, "web/next/src/app/fonts.css"), FONTS_CSS)
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

  test("writes a fresh branded site.ts, a waitlist home route, and content stubs", () => {
    scaffold()
    convertRepo(dir, { name: "acme" })
    const site = read(join(dir, "packages/config/src/site.ts"))
    expect(site).toContain('name: "Acme"')
    expect(site).not.toContain("upstream site")
    expect(exists(join(dir, "web/next/content/docs/index.mdx"))).toBe(true)
    expect(read(join(dir, "web/next/src/app/index.tsx"))).toContain('to: "/waitlist"')
    expect(exists(join(dir, "AGENTS.md"))).toBe(true)
    expect(read(join(dir, "README.md"))).not.toContain("nrjdalal")
  })

  test("reconciles the dangling font exports and /hire link", () => {
    scaffold()
    convertRepo(dir, { name: "acme" })
    expect(fonts()).not.toContain("caveat")
    expect(fonts()).toContain("dmSans")
    expect(fontsCss()).not.toContain("fonts/marketing/")
    expect(nav()).not.toContain("/hire")
  })
})
