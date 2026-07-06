import { definePackageConfig } from "@packages/config/tsdown"

export default definePackageConfig({
  deps: { alwaysBundle: [/^@packages\//], neverBundle: ["bun"] },
})
