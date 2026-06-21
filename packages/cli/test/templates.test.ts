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

test("homeTemplate redirects a fresh fork to the waitlist", () => {
  const out = homeTemplate()
  expect(out).toContain('from "next/navigation"')
  expect(out).toContain('redirect("/waitlist")')
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
