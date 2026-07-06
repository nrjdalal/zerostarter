import { definePackageConfig } from "@packages/config/tsdown"

export default definePackageConfig({
  deps: { neverBundle: ["bun"] },
})
