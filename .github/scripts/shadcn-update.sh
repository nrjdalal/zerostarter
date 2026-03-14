#! /bin/bash

cd web/next || exit 1
rm -rf components.json src/components/ui
bunx shadcn@latest init . --template next --preset "https://ui.shadcn.com/init?base=base&style=nova&baseColor=neutral&theme=neutral&iconLibrary=remixicon&font=inter&menuAccent=subtle&menuColor=default&radius=default"
bunx shadcn@latest add -a
rm -rf src/components/component-example.tsx src/components/example.tsx
cd ../..
bun run format
bun i
git restore web/next/src/app/layout.tsx