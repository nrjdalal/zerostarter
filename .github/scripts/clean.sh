#!/bin/sh

# Remove generated, disposable artifacts (build outputs, caches, codegen) tracked in .gitignore so `bun run clean` gives a fresh tree; user config and secrets stay.
bunx rimraf --glob \
  "**/*.tsbuildinfo" \
  "**/.generated" \
  "**/.next" \
  "**/.playwright-cli" \
  "**/.source" \
  "**/.turbo" \
  "**/bundle" \
  "**/coverage" \
  "**/dist" \
  "**/next-env.d.ts" \
  "**/node_modules" \
  "**/vercel-bundle" \
  ".github/scripts/*.d.ts" \
  "web/next/content/blog/meta.json" \
  "web/next/content/console/docs/meta.json" \
  "web/next/content/docs/meta.json"
