import pkg from "./package.json"

await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  target: "bun",
  minify: true,
  external: Object.keys(pkg.dependencies ?? {}),
})

await Bun.$`tsc --emitDeclarationOnly --declaration --outDir dist`

export {}
