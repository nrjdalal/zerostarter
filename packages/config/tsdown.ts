import { defineConfig } from "tsdown"

type BundleDeps = {
  neverBundle?: (string | RegExp)[]
  alwaysBundle?: (string | RegExp)[]
}

// Shared tsdown config for the backend packages: validates env in build:prepare via the caller's getSafeEnv (passed in so this package stays env-agnostic, avoiding a config<->env cycle), emits dts, and minifies. Callers supply only their name, env, and any bundle overrides.
export function definePackageConfig(options: {
  name: string
  env: Record<string, unknown>
  getSafeEnv: (env: Record<string, unknown>, name?: string) => unknown
  define?: Record<string, string>
  deps?: BundleDeps
  // The entry list for a package that ships more than one, replacing rather than adding to the default, so a caller listing extras restates src/index.ts too.
  entry?: string[]
}) {
  const { name, env, getSafeEnv, define, deps, entry } = options

  return [
    defineConfig({
      ...(define ? { define } : {}),
      ...(deps ? { deps } : {}),
      entry: entry ?? ["src/index.ts"],
      hooks: {
        "build:prepare": () => {
          getSafeEnv(env, name)
        },
      },
      minify: true,
    }),
  ]
}
