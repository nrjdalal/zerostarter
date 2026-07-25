import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  agentsTemplate,
  blogIndexTemplate,
  consoleIndexTemplate,
  docsConfigTemplate,
  docsIndexTemplate,
  homeTemplate,
  sampleBlogPostTemplate,
  siteTemplate,
} from "../src/templates"

const brand = { name: "acme" }

test("siteTemplate capitalizes the brand and leaks no upstream identity", () => {
  const out = siteTemplate(brand)
  expect(out).toContain('name: "Acme"')
  expect(out).not.toContain("zerostarter")
  expect(out).not.toContain("nrjdalal")
})

// A key present in packages/config/src/site.ts but missing from siteTemplate ships a fork whose site.ts lacks it, so any shared component reading it throws at runtime and the fork fails check-types. The key list is READ FROM THE SOURCE CONFIG, not hand-written: a hard-coded list would still pass green for exactly the case this guards, a key added upstream and forgotten here.
const topLevelKeys = (source: string): string[] => {
  const body = source.slice(
    source.indexOf("export const site = {") + "export const site = {".length,
  )
  const keys: string[] = []
  let depth = 0
  for (const line of body.split("\n")) {
    if (depth === 0 && line.startsWith("}")) break
    const match = depth === 0 ? line.match(/^ {2}([a-zA-Z][a-zA-Z0-9]*):/) : null
    if (match) keys.push(match[1])
    depth += (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length
  }
  return keys
}

test("siteTemplate emits every key the shared site config declares", () => {
  const source = readFileSync(join(import.meta.dirname, "../../config/src/site.ts"), "utf8")
  const declared = topLevelKeys(source)
  // guards the parser itself: if it silently matched nothing the assertion below would be vacuous
  expect(declared.length).toBeGreaterThan(5)
  expect(declared).toContain("legal")

  const out = siteTemplate(brand)
  const emitted = topLevelKeys(out)
  expect(declared.filter((key) => !emitted.includes(key))).toEqual([])
})

test("siteTemplate emits the fork feature defaults (waitlist off)", () => {
  const out = siteTemplate(brand)
  expect(out).toContain("export const features")
  expect(out).toContain("waitlist: false")
  expect(out).toContain("docs: true")
  expect(out).toContain("export type Feature = keyof typeof features")
})

test("siteTemplate honors an explicit feature set", () => {
  const out = siteTemplate(brand, {
    apiDocs: false,
    blog: false,
    docs: true,
    internalDocs: false,
    waitlist: true,
  })
  expect(out).toContain("apiDocs: false")
  expect(out).toContain("blog: false")
  expect(out).toContain("waitlist: true")
})

test("homeTemplate branches between the waitlist and a plain landing", () => {
  const out = homeTemplate()
  expect(out).toContain('from "next/navigation"')
  expect(out).toContain('if (features.waitlist) redirect("/waitlist")')
  expect(out).toContain("{site.name}")
  expect(out).not.toContain("zerostarter")
})

test("generated docs.config.ts is a valid DocsConfig satisfies block", () => {
  const out = docsConfigTemplate()
  expect(out).toContain("satisfies DocsConfig")
  expect(out).toContain("export default docsConfig")
})

test("content + agent stubs are brand-free", () => {
  const stubs = [
    docsIndexTemplate(),
    blogIndexTemplate("2026-01-01"),
    sampleBlogPostTemplate("2026-01-01"),
    consoleIndexTemplate(),
    agentsTemplate(),
  ]
  for (const out of stubs) {
    expect(out).not.toContain("zerostarter")
    expect(out).not.toContain("nrjdalal")
  }
})
