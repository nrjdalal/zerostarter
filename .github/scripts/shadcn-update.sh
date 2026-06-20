#!/bin/sh

# The sync wipes ui/ and re-scaffolds these paths (shadcn-customize.ts later resets some to HEAD),
# so uncommitted work anywhere in this blast radius would be clobbered silently. Refuse to run on it.
set -- web/next/src/components/ui web/next/components.json web/next/package.json bun.lock \
  web/next/src/app/layout.tsx web/next/src/lib/utils.ts web/next/src/app/globals.css
if [ -n "$(git status --porcelain -- "$@")" ]; then
  echo "shadcn-update: commit or stash changes in the sync's blast radius first:" >&2
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
