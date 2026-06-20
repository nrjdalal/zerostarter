import { join } from "node:path"

import { type ArrayLiteralExpression, Node, Project, SyntaxKind } from "ts-morph"

import { exists, readJson, remove, replaceInFile, write, writeJson } from "@/io"
import {
  blogIndexTemplate,
  type Brand,
  docsConfigTemplate,
  docsIndexTemplate,
  homeTemplate,
  readmeTemplate,
  sampleBlogPostTemplate,
  siteTemplate,
} from "@/templates"

// Straggler tokens, applied after the structural deletes. Most-specific first.
const tokens = (b: Brand): Array<[string, string]> => [
  ["agent@zerostarter.dev", "agent@example.com"],
  ["https://github.com/nrjdalal/zerostarter", `https://github.com/${b.owner}/${b.repo}`],
  ["https://x.com/nrjdalal", ""],
  ["https://discord.gg/38FeAUmHSZ", ""],
  ["nrjdalal/zerostarter", `${b.owner}/${b.repo}`],
  ["zerostarter.dev", `${b.repo}.example.com`],
  ["AgentZero", "Agent"],
  ["/tmp/zerostarter-dev.log", `/tmp/${b.repo}-dev.log`],
  ["zerostarter-web", `${b.repo}-web`],
  ["ZeroStarter", b.name],
  ["zerostarter", b.repo],
]

const p = (root: string, ...parts: string[]): string => join(root, ...parts)

// Class 1: regenerate the centralized brand file.
const rewriteSite = (root: string, b: Brand): void => {
  write(p(root, "packages/config/src/site.ts"), siteTemplate(b))
}

// Class 1: swap identity in the root package.json (JSON, preserve shape).
const rewritePackageJson = (root: string, b: Brand): void => {
  const path = p(root, "package.json")
  const pkg = readJson<Record<string, unknown>>(path)
  pkg.name = b.repo
  pkg.version = "0.0.0"
  pkg.homepage = `https://github.com/${b.owner}/${b.repo}#readme`
  pkg.bugs = `https://github.com/${b.owner}/${b.repo}/issues`
  pkg.repository = `${b.owner}/${b.repo}`
  pkg.funding = `https://github.com/sponsors/${b.owner}`
  pkg.author = { name: "TODO: your name", email: "", url: "" }
  writeJson(path, pkg)
}

// Class 1: the remaining text/JSON config files (rulesets, scripts, compose, env are covered by the final token pass).
const rewriteConfigs = (root: string, b: Brand): void => {
  replaceInFile(p(root, "LICENSE.md"), [
    ["Copyright (c) 2025 Neeraj Dalal", "Copyright (c) 2026 TODO: your name"],
  ])
  replaceInFile(p(root, ".github/FUNDING.yml"), [["github: nrjdalal", `github: ${b.owner}`]])
  remove(p(root, ".infisical.json"))
}

// Class 2: replace the marketing landing, delete personal routes, rewrite README.
const stripMarketing = (root: string, b: Brand): void => {
  write(p(root, "web/next/src/app/page.tsx"), homeTemplate())
  remove(p(root, "web/next/src/app/hire"))
  remove(p(root, "web/next/src/app/resume"))
  write(p(root, "README.md"), readmeTemplate(b))
}

// Class 2: remove the /hire nav entry via ts-morph (targeted AST edit of a kept file).
const fixNavbar = (root: string): void => {
  const path = p(root, "web/next/src/components/navbar/home.tsx")
  if (!exists(path)) return
  const project = new Project()
  const sf = project.addSourceFileAtPath(path)
  const removals: Array<{ array: ArrayLiteralExpression; index: number }> = []
  for (const arr of sf.getDescendantsOfKind(SyntaxKind.ArrayLiteralExpression)) {
    arr.getElements().forEach((el, index) => {
      if (Node.isObjectLiteralExpression(el) && el.getText().includes('"/hire"')) {
        removals.push({ array: arr, index })
      }
    })
  }
  removals
    .sort((a, b) => b.index - a.index)
    .forEach(({ array, index }) => array.removeElement(index))
  if (removals.length) sf.saveSync()
}

// Class 2: strip blog posts to one anchor.
const stripBlog = (root: string): void => {
  const blog = p(root, "web/next/content/blog")
  remove(join(blog, "a-biography-written-in-code.mdx"))
  remove(join(blog, "web-development-2026.mdx"))
  remove(join(blog, "mcp-per-workspace.mdx"))
  remove(p(root, "web/next/public/blog/mcp-per-workspace"))
  write(join(blog, "index.mdx"), blogIndexTemplate())
  write(join(blog, "hello-world.mdx"), sampleBlogPostTemplate())
}

// Class 2: strip docs to one anchor, regenerate docs.config.ts.
const consoleIndex = (): string => `---
slug: /console/docs
title: Introduction
description: Internal documentation.
---

# Introduction

Internal admin documentation. Replace this page with your own.
`

const stripDocs = (root: string): void => {
  const docs = p(root, "web/next/content/docs")
  for (const entry of [
    "getting-started",
    "manage",
    "deployment",
    "resources",
    "contributing.mdx",
  ]) {
    remove(join(docs, entry))
  }
  write(join(docs, "index.mdx"), docsIndexTemplate())
  write(p(root, "web/next/docs.config.ts"), docsConfigTemplate())
  write(p(root, "web/next/content/console/docs/index.mdx"), consoleIndex())
}

// Class 3: prune branded and demo assets.
const pruneAssets = (root: string): void => {
  for (const f of [
    "file.svg",
    "globe.svg",
    "window.svg",
    "next.svg",
    "vercel.svg",
    "graph-build.svg",
  ]) {
    remove(p(root, "web/next/public", f))
  }
  remove(p(root, ".github/assets/graph-build.svg"))
}

// Class 4: scrub agent/meta docs (the symlinks follow the real files).
const scrubMeta = (root: string): void => {
  replaceInFile(p(root, "web/next/src/components/mode-toggle.tsx"), [
    ["  /* The smart toggle by @nrjdalal */\n", ""],
    ["/* The smart toggle by @nrjdalal */", ""],
  ])
}

// Remove starter-only tooling a product fork does not keep.
const removeStarterTooling = (root: string): void => {
  remove(p(root, "packages/cli"))
  remove(p(root, ".agents/skills/init"))
  remove(p(root, ".agents/skills/fork-sync"))
  remove(p(root, ".github/audit"))
}

// Final scoped token sweep over the source tree.
const finalReplace = (root: string, b: Brand): void => {
  const files = [
    "AGENTS.md",
    ".github/FUNDING.yml",
    ".github/rulesets/main.json",
    ".github/rulesets/canary.json",
    ".github/scripts/changelog-manager.ts",
    ".github/scripts/build-sizes.ts",
    "docker-compose.yml",
    ".env.example",
    ".agents/skills/dev/SKILL.md",
    ".agents/skills/fonts/SKILL.md",
    ".agents/skills/docker-test/SKILL.md",
  ]
  for (const f of files) replaceInFile(p(root, f), tokens(b))
}

export const convertRepo = (root: string, brand: Brand): void => {
  rewriteSite(root, brand)
  rewritePackageJson(root, brand)
  rewriteConfigs(root, brand)
  stripMarketing(root, brand)
  fixNavbar(root)
  stripBlog(root)
  stripDocs(root)
  pruneAssets(root)
  scrubMeta(root)
  removeStarterTooling(root)
  finalReplace(root, brand)
}
