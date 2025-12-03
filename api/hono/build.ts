await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  target: "bun",
  minify: true,
})

await Bun.$`tsc --emitDeclarationOnly --declaration --outDir dist`

export {}
