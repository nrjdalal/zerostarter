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

const brand = { name: "Acme" }

test("siteTemplate carries the brand and leaks no upstream identity", () => {
  const out = siteTemplate(brand)
  expect(out).toContain('name: "Acme"')
  expect(out).not.toContain("zerostarter")
  expect(out).not.toContain("nrjdalal")
})

test("homeTemplate reads the brand from site config", () => {
  const out = homeTemplate()
  expect(out).toContain('from "@packages/config/site"')
  expect(out).toContain("site.name")
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
    blogIndexTemplate(),
    sampleBlogPostTemplate(),
    consoleIndexTemplate(),
    agentsTemplate(),
  ]
  for (const out of stubs) {
    expect(out).not.toContain("zerostarter")
    expect(out).not.toContain("nrjdalal")
  }
})
