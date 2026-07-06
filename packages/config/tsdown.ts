import { defineConfig } from "tsdown"

type BundleDeps = {
  neverBundle?: (string | RegExp)[]
  alwaysBundle?: (string | RegExp)[]
}

// Shared tsdown config: never reads env, so building a package never validates it. env/getSafeEnv are accepted but intentionally unused, for callers that keep a required @packages/env import (see packages/auth/tsdown.config.ts).
export function definePackageConfig(
  options: { env?: unknown; getSafeEnv?: unknown; deps?: BundleDeps } = {},
) {
  const { deps } = options

  return [
    defineConfig({
      ...(deps ? { deps } : {}),
      dts: { tsgo: true },
      entry: ["src/index.ts"],
      minify: true,
    }),
  ]
}
