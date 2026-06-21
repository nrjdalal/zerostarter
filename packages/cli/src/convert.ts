import { join } from "node:path"

import { readJson, remove, replaceInFile, write, writeJson } from "@/io"
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

// Author pages, dev-meta, starter tooling, and resume-only fonts a fork does not ship.
const REMOVE_PATHS = [
  "packages/cli",
  ".github/audit",
  ".github/reviews",
  ".infisical.json",
  ".github/assets/graph-build.svg",
  "web/next/src/app/hire",
  "web/next/src/app/resume",
  "web/next/src/fonts/caveat-latin-wght-normal.woff2",
  "web/next/src/fonts/newsreader-latin-wght-normal.woff2",
  "web/next/src/fonts/newsreader-latin-wght-italic.woff2",
]

// The two font exports whose woff2 files are removed above (only the deleted routes used them).
const CAVEAT_EXPORT = `
export const caveat = localFont({
  src: "../fonts/caveat-latin-wght-normal.woff2",
  variable: "--font-caveat",
  weight: "400 700",
})
`
const NEWSREADER_EXPORT = `
export const newsreader = localFont({
  src: [
    { path: "../fonts/newsreader-latin-wght-normal.woff2", style: "normal" },
    { path: "../fonts/newsreader-latin-wght-italic.woff2", style: "italic" },
  ],
  variable: "--font-newsreader",
  weight: "200 800",
})
`

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

// Clean up the references the route and font deletes leave dangling.
const fixDangling = (root: string): void => {
  replaceInFile(p(root, "web/next/src/components/navbar/home.tsx"), [
    ['    { href: "/hire", label: "Hire" },\n', ""],
  ])
  replaceInFile(p(root, "web/next/src/lib/fonts.ts"), [
    [CAVEAT_EXPORT, ""],
    [NEWSREADER_EXPORT, ""],
  ])
}

// Point config that would otherwise misattribute the fork at the new repo.
const fixConfig = (root: string, b: Brand): void => {
  const year = new Date().getFullYear()
  replaceInFile(p(root, "LICENSE.md"), [
    ["Copyright (c) 2025 Neeraj Dalal", `Copyright (c) ${year} ${b.owner}`],
  ])
  replaceInFile(p(root, ".github/FUNDING.yml"), [["github: nrjdalal", `github: ${b.owner}`]])
  for (const rs of ["main", "canary"]) {
    replaceInFile(p(root, `.github/rulesets/${rs}.json`), [
      ["nrjdalal/zerostarter", `${b.owner}/${b.repo}`],
    ])
  }
  replaceInFile(p(root, ".github/scripts/changelog-manager.ts"), [
    ['"nrjdalal"', `"${b.owner}"`],
    ['"zerostarter"', `"${b.repo}"`],
  ])
  replaceInFile(p(root, ".github/scripts/build-sizes.ts"), [["zerostarter", b.repo]])
  replaceInFile(p(root, "docker-compose.yml"), [["name: zerostarter", `name: ${b.repo}`]])
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
  for (const dir of [...IGNORED_DIRS, ...REMOVE_PATHS]) remove(p(root, dir))
  scaffoldContent(root)
  fixDangling(root)
  fixConfig(root, brand)
  rebrand(root, brand)
}
