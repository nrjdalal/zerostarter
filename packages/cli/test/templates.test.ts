import { expect, test } from "bun:test"

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
  expect(out).toContain("if (features.waitlist) redirect(\"/waitlist\")")
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
