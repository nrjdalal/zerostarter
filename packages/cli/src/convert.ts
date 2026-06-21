import { basename, extname, join } from "node:path"

import { type ArrayLiteralExpression, Node, Project, SyntaxKind } from "ts-morph"

import { exists, list, readJson, remove, replaceInFile, walk, write, writeJson } from "@/io"
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

// Brand tokens applied as a whole-tree sweep after the structural deletes. Most-specific first.
const tokens = (b: Brand): Array<[string, string]> => [
  ["agent@zerostarter.dev", "agent@example.com"],
  ["https://github.com/nrjdalal/zerostarter", `https://github.com/${b.owner}/${b.repo}`],
  ["https://x.com/nrjdalal", ""],
  ["https://discord.gg/38FeAUmHSZ", ""],
  ["nrjdalal/zerostarter", `${b.owner}/${b.repo}`],
  ["zerostarter.dev", `${b.repo}.example.com`],
  ["Neeraj Dalal", "TODO: your name"],
  ["AgentZero", "Agent"],
  ["/tmp/zerostarter-dev.log", `/tmp/${b.repo}-dev.log`],
  ["zerostarter-web", `${b.repo}-web`],
  ["ZeroStarter", b.name],
  ["zerostarter", b.repo],
]

const p = (root: string, ...parts: string[]): string => join(root, ...parts)

// Directories the whole-tree token sweep never descends into.
const SWEEP_SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  ".next",
  ".turbo",
  ".source",
  ".vercel",
  "dist",
])

// Files the sweep leaves untouched: the lockfile, generated history, and the fork's own README.
const SWEEP_SKIP_FILES = new Set(["bun.lock", "CHANGELOG.md", "README.md"])

// Binary extensions the sweep must not rewrite.
const SWEEP_SKIP_EXT = new Set([
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".avif",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".eot",
  ".pdf",
  ".mp4",
  ".webm",
  ".lock",
])

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

// Class 1: config files whose edits are not a plain token swap.
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

// Class 2: clear the blog collection to a single sample and drop every per-post asset folder.
const stripBlog = (root: string): void => {
  const blog = p(root, "web/next/content/blog")
  for (const entry of list(blog)) remove(join(blog, entry))
  write(join(blog, "index.mdx"), blogIndexTemplate())
  write(join(blog, "hello-world.mdx"), sampleBlogPostTemplate())
  const assets = p(root, "web/next/public/blog")
  for (const entry of list(assets)) remove(join(assets, entry))
}

const consoleIndex = (): string => `---
slug: /console/docs
title: Introduction
description: Internal documentation.
---

# Introduction

Internal admin documentation. Replace this page with your own.
`

// Class 2: clear the docs and console collections to one anchor each, regenerate docs.config.ts.
const stripDocs = (root: string): void => {
  const docs = p(root, "web/next/content/docs")
  for (const entry of list(docs)) remove(join(docs, entry))
  write(join(docs, "index.mdx"), docsIndexTemplate())
  const consoleDocs = p(root, "web/next/content/console/docs")
  for (const entry of list(consoleDocs)) remove(join(consoleDocs, entry))
  write(join(consoleDocs, "index.mdx"), consoleIndex())
  write(p(root, "web/next/docs.config.ts"), docsConfigTemplate())
}

// Class 3: prune the Next.js demo assets and the generated build graphs.
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

// Class 4: scrub the attribution comment (symlinks follow the real files).
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

// Whole-tree token sweep: every text file picks up the rename, so new content needs no CLI change.
const finalReplace = (root: string, b: Brand): void => {
  const pairs = tokens(b)
  for (const file of walk(root, SWEEP_SKIP_DIRS)) {
    const base = basename(file)
    if (SWEEP_SKIP_FILES.has(base)) continue
    if (base.startsWith(".env") && base !== ".env.example") continue
    if (SWEEP_SKIP_EXT.has(extname(file).toLowerCase())) continue
    replaceInFile(file, pairs)
  }
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
