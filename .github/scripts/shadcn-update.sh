#!/bin/sh

cd web/next || exit 1
rm -rf components.json src/components/ui
bunx shadcn@latest init --template next --preset a16C8 --base base
bunx shadcn@latest add -a
cd ../..
bun .github/scripts/shadcn-customize.ts
bun run format
