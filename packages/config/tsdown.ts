import { defineConfig } from "tsdown"

type BundleDeps = {
  neverBundle?: (string | RegExp)[]
  alwaysBundle?: (string | RegExp)[]
}

// Shared tsdown config for the backend packages: emits tsgo dts and minifies. It never reads env, so building a package does not validate env; each env file is validated at runtime by the package that owns it. The optional `env` is accepted only so a caller can keep its env import in the package's tsconfig program (auth's dts generation needs the zod reference that import transitively provides) without it counting as unused; it is never read here.
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
