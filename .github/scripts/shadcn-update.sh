#!/bin/sh

# shadcn init and add -a rewrite these paths, and shadcn-customize.ts resets some to HEAD. An uncommitted change here can be lost, so the script stops.
set -- web/next/src/components/ui web/next/components.json web/next/package.json bun.lock package.json \
  web/next/src/app/layout.tsx web/next/src/app/globals.css web/next/src/hooks web/next/src/lib
if [ -n "$(git status --porcelain -- "$@")" ]; then
  echo "shadcn-update: these files have uncommitted changes, and the sync can overwrite them. Commit or stash them first:" >&2
  git status --porcelain -- "$@" >&2
  exit 1
fi

cd web/next || exit 1
rm -rf components.json src/components/ui
bunx shadcn@latest init --template next --preset a16C8 --base base
bunx shadcn@latest add -a
cd ../..
bun .github/scripts/shadcn-customize.ts
bun run format
