import { join } from "node:path"

import { readJson, remove, write, writeJson } from "@/io"
import {
  blogIndexTemplate,
  type Brand,
  docsConfigTemplate,
  docsIndexTemplate,
  sampleBlogPostTemplate,
  siteTemplate,
} from "@/templates"

const p = (root: string, ...parts: string[]): string => join(root, ...parts)

// Directories a fork supplies itself: the author's content, assets, and agent skills.
const IGNORED_DIRS = ["web/next/content", "web/next/public", ".agents/skills", ".claude/skills"]

// Starter-only tooling a fork does not ship.
const STARTER_ONLY = ["packages/cli", ".github/audit"]

const consoleIndex = (): string => `---
slug: /console/docs
title: Introduction
description: Internal documentation.
---

# Introduction

Your team's internal docs live here.
`

// Drop a generic content stub so the app builds once the author's content is gone.
const scaffoldContent = (root: string): void => {
  write(p(root, "web/next/content/docs/index.mdx"), docsIndexTemplate())
  write(p(root, "web/next/content/blog/index.mdx"), blogIndexTemplate())
  write(p(root, "web/next/content/blog/hello-world.mdx"), sampleBlogPostTemplate())
  write(p(root, "web/next/content/console/docs/index.mdx"), consoleIndex())
  write(p(root, "web/next/docs.config.ts"), docsConfigTemplate())
}

// Regenerate the centralized brand file and rename the root package.
const rebrand = (root: string, b: Brand): void => {
  write(p(root, "packages/config/src/site.ts"), siteTemplate(b))
  const path = p(root, "package.json")
  const pkg = readJson<Record<string, unknown>>(path)
  pkg.name = b.repo
  pkg.version = "0.0.0"
  pkg.homepage = `https://github.com/${b.owner}/${b.repo}#readme`
  pkg.bugs = `https://github.com/${b.owner}/${b.repo}/issues`
  pkg.repository = `${b.owner}/${b.repo}`
  pkg.funding = `https://github.com/sponsors/${b.owner}`
  pkg.author = { name: "Your name here", email: "", url: "" }
  writeJson(path, pkg)
}

export const convertRepo = (root: string, brand: Brand): void => {
  for (const dir of [...IGNORED_DIRS, ...STARTER_ONLY]) remove(p(root, dir))
  scaffoldContent(root)
  rebrand(root, brand)
}
