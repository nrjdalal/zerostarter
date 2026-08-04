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
} from "../../../../packages/cli/src/templates"

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
    allowlist: false,
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

// A fork inherits the skills-manager pre-commit hook, and that script throws on an AGENTS.md without these markers. Without them a scaffolded fork could not make its first commit.
test("agentsTemplate carries the skills-table markers the fork's pre-commit hook needs", () => {
  const out = agentsTemplate()
  for (const id of ["custom", "vendored"]) {
    expect(out).toContain(`<!-- skills:${id} -->`)
    expect(out).toContain(`<!-- /skills:${id} -->`)
    // the same shape .github/scripts/skills-manager.ts matches when it rewrites a region
    expect(new RegExp(`(<!-- skills:${id} -->)[\\s\\S]*?(<!-- /skills:${id} -->)`).test(out)).toBe(
      true,
    )
  }
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
