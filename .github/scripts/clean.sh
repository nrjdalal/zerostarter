#!/bin/sh

bunx rimraf --glob \
  "**/.next" \
  "**/.source" \
  "**/.turbo" \
  "**/bundle" \
  "**/dist" \
  "**/node_modules" \
  "**/next-env.d.ts" \
  "**/tsconfig.tsbuildinfo"
